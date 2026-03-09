import json
import io
import time
from typing import List

import replicate
from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from loguru import logger

from app.core.config import get_settings
from app.schemas.outfits import ScoreBreakdown, SuggestionCard, UserContext

settings = get_settings()


def _parse_suggestions(raw: str) -> List[SuggestionCard]:
  text = raw.strip()
  if "[" in text and "]" in text:
    text = text[text.index("[") : text.rindex("]") + 1]
  text = text.replace("\\_", "_").strip()
  try:
    data = json.loads(text)
  except Exception:
    data = None
    import re
    # Fallback: extract repeating title/type/description triples even if braces are broken
    titles = re.findall(r'"title"\s*:\s*"([^"]+)"', text)
    types = re.findall(r'"type"\s*:\s*"([^"]+)"', text)
    descs = re.findall(r'"description"\s*:\s*"([^"]+)"', text)
    items = []
    for idx, title in enumerate(titles):
      desc = descs[idx] if idx < len(descs) else ""
      typ = types[idx] if idx < len(types) else "other"
      items.append({"title": title, "type": typ, "description": desc})
    if items:
      data = items

  cards: List[SuggestionCard] = []
  if isinstance(data, list):
    for item in data[:15]:
      if not isinstance(item, dict):
        continue
      title = (item.get("title") or "").strip()
      desc = (item.get("description") or item.get("desc") or item.get("suggestion") or "").strip()
      type_tag = (item.get("type") or item.get("category") or "other").strip()
      if title and desc:
        cards.append(SuggestionCard(title=title, type=type_tag, description=desc))
  return cards


async def generate_suggestions(
  breakdown: ScoreBreakdown, user_ctx: UserContext, image_bytes: bytes
) -> List[SuggestionCard]:
  """Use a vision-language model (VLM) to generate grounded suggestions from the actual image."""
  if not settings.replicate_api_token:
    raise HTTPException(
      status_code=503,
      detail="Replicate API token missing for suggestions.",
    )

  sys_prompt = (
    "You are a fashion assistant. Look at the image and produce 15 outfit improvement tips as a JSON array. "
    "Each item: {\"title\": <=8 words, \"type\": one of [fit, layering, color, accessory, other], "
    "\"description\": <=25 words, actionable and respectful}. "
    "Do not repeat the same idea. Balance across types; avoid listing only accessories. "
    "Ground every tip in what is actually visible. Do NOT invent garments that are not visible. "
    "Return ONLY valid JSON array, exactly 15 objects, no trailing commas, no extra text."
  )
  user_prompt = (
    f"User style prefs: {', '.join(user_ctx.style_preferences) or 'unspecified'}; "
    f"inspirations: {', '.join(user_ctx.style_inspirations) or 'unspecified'}; "
    f"height: {user_ctx.user_height or 'n/a'}; body_type: {user_ctx.user_body_type or 'n/a'}; "
    f"gender_style: {user_ctx.gender_style_preference or 'n/a'}. "
    f"Scores (0-10): color_match={breakdown.color_match}, fit_quality={breakdown.fit_quality}, "
    f"body_compatibility={breakdown.body_compatibility}, trend_score={breakdown.trend_score}, "
    f"style_match={breakdown.style_match}. "
    "Focus first on weakest scores. Output JSON array only."
  )

  def _call_vlm():
    client = replicate.Client(api_token=settings.replicate_api_token, timeout=60)
    model_ref = settings.replicate_vlm_model
    file_obj = io.BytesIO(image_bytes)
    file_obj.name = "upload.jpg"
    tries = 0
    while True:
      tries += 1
      try:
        result = client.run(
          model_ref,
          input={
            "image": file_obj,
            "prompt": sys_prompt + "\n\n" + user_prompt,
            "temperature": 0.2,
            "top_p": 0.9,
            "max_tokens": 900,
          },
        )
        break
      except replicate.exceptions.ReplicateError as exc:
        if exc.status == 429 and tries == 1:
          time.sleep(4)
          continue
        raise
    if isinstance(result, (list, tuple)):
      return "".join(str(x) for x in result)
    if hasattr(result, "__iter__") and not isinstance(result, (str, bytes)):
      return "".join(str(x) for x in result)
    return str(result)

  raw = await run_in_threadpool(_call_vlm)
  cards = _parse_suggestions(raw)
  # post-filter: dedupe titles, normalize types, cap 15, prefer type diversity
  seen = set()
  normalized = []
  allowed_types = {"fit", "layering", "color", "accessory", "other"}
  for c in cards:
    title_key = c.title.strip().lower()
    if title_key in seen:
      continue
    seen.add(title_key)
    c.type = c.type.lower()
    if c.type not in allowed_types:
      c.type = "other"
    normalized.append(c)
  # ensure mix: sort to favor non-accessory first then accessories
  normalized.sort(key=lambda c: 1 if c.type == "accessory" else 0, reverse=False)
  cards = normalized[:15]

  if not cards:
    logger.error(f"VLM suggestion parse failed; raw='{raw[:800]}'")
    raise HTTPException(
      status_code=502,
      detail="LLM suggestions unavailable; please retry shortly.",
    )

  logger.debug(f"VLM suggestions parsed {len(cards)} items")
  return cards
