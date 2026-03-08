import json
import time
from typing import List

import replicate
from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from loguru import logger

from app.core.config import get_settings
from app.schemas.outfits import ScoreBreakdown, SuggestionCard, UserContext

settings = get_settings()
DEFAULT_LLM_MODEL = "meta/meta-llama-3-70b-instruct"
PROMPT_TEMPLATE = "{prompt}"  # disable extra formatting on the server side


def _build_prompt(breakdown: ScoreBreakdown, user_ctx: UserContext) -> str:
  sys_msg = (
    "You are a sharp fashion assistant creating short, punchy improvement cards for an outfit. "
    "Return 15 suggestions as a JSON array of objects with fields: title (<=8 words), "
    "type (one of fit, layering, color, accessory, other), description (<=25 words, actionable). "
    "No extra text, just valid JSON."
  )
  user_msg = (
    "User style prefs: "
    f"{', '.join(user_ctx.style_preferences) or 'unspecified'}; "
    f"inspirations: {', '.join(user_ctx.style_inspirations) or 'unspecified'}; "
    f"height: {user_ctx.user_height or 'n/a'}; "
    f"body_type: {user_ctx.user_body_type or 'n/a'}; "
    f"gender_style: {user_ctx.gender_style_preference or 'n/a'}. "
    "Scores (0-10): "
    f"color_match={breakdown.color_match}, fit_quality={breakdown.fit_quality}, "
    f"body_compatibility={breakdown.body_compatibility}, trend_score={breakdown.trend_score}, "
    f"style_match={breakdown.style_match}. "
    "Create specific, respectful tweaks that would raise the weakest areas first."
  )
  return (
    "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"
    f"{sys_msg}\n"
    "<|eot_id|><|start_header_id|>user<|end_header_id|>\n"
    f"{user_msg}\n"
    "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n"
  )


async def generate_suggestions(
  breakdown: ScoreBreakdown, user_ctx: UserContext, image_bytes: bytes
) -> List[SuggestionCard]:
  if not settings.replicate_api_token:
    raise HTTPException(
      status_code=503,
      detail="Replicate API token missing for suggestions.",
    )

  prompt = _build_prompt(breakdown, user_ctx)

  def _call_llm():
    client = replicate.Client(api_token=settings.replicate_api_token, timeout=30)
    model_ref = settings.replicate_llm_model or DEFAULT_LLM_MODEL
    if ":" not in model_ref:
      model_ref = DEFAULT_LLM_MODEL
    tries = 0
    while True:
      tries += 1
      try:
        result = client.run(
          model_ref,
          input={
            "prompt": prompt,
            "prompt_template": PROMPT_TEMPLATE,
            "max_tokens": 650,
            "min_tokens": 220,
            "top_p": 0.9,
            "temperature": 0.6,
            "presence_penalty": 0.15,
            "frequency_penalty": 0.1,
          },
        )
        break
      except replicate.exceptions.ReplicateError as exc:
        if exc.status == 429 and tries == 1:
          time.sleep(4)
          continue
        raise
    return "".join(result) if isinstance(result, list) else str(result)

  raw = await run_in_threadpool(_call_llm)

  def parse_cards(text: str) -> List[SuggestionCard]:
    # try full JSON
    candidates = []
    try:
      obj = json.loads(text)
      if isinstance(obj, list):
        candidates = obj
    except Exception:
      pass

    # salvage between first [ and last ]
    if not candidates and "[" in text and "]" in text:
      frag = text[text.find("[") : text.rfind("]") + 1]
      try:
        obj = json.loads(frag)
        if isinstance(obj, list):
          candidates = obj
      except Exception:
        pass

    # salvage line-by-line objects
    if not candidates:
      for line in text.splitlines():
        line = line.strip().rstrip(",")
        if line.startswith("{") and line.endswith("}"):
          try:
            obj = json.loads(line)
            if isinstance(obj, dict):
              candidates.append(obj)
          except Exception:
            continue

    cards: List[SuggestionCard] = []
    for item in candidates:
      if not isinstance(item, dict):
        continue
      title = (item.get("title") or "").strip()
      desc = (item.get("description") or item.get("desc") or "").strip()
      type_tag = (item.get("type") or "other").strip()
      if title and desc:
        cards.append(SuggestionCard(title=title, type=type_tag, description=desc))

    if not cards:
      raise ValueError("no parseable JSON from LLM")
    return cards[:15]

  try:
    cards = parse_cards(raw)
  except Exception as exc:
    logger.error(f"LLM suggestion parse failed; raw='{raw[:800]}' err={exc}")
    raise HTTPException(
      status_code=502,
      detail="LLM suggestions unavailable; please retry shortly.",
    ) from exc

  logger.debug(f"LLM suggestions parsed {len(cards)} items")
  return cards
