import json

from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, status, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.schemas.outfits import ScoreResponse, UserContext
from app.db.session import get_db
from app.services.ai_scoring import score_with_ai
from app.models import Outfit, OutfitScore, OutfitSuggestion, SuggestionTypeEnum, DripScoreHistory

router = APIRouter(prefix="/v1/outfits", tags=["outfits"])


@router.post(
  "/score",
  response_model=ScoreResponse,
  summary="Score an outfit image (stubbed)",
)
async def score_outfit(
  image: UploadFile = File(...),
  user_context: str = Form(..., description="JSON of user context"),
  db: AsyncSession = Depends(get_db),
):
  if not image.content_type or not image.content_type.startswith("image/"):
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Upload must be an image (jpg/png).",
    )

  try:
    ctx_raw = json.loads(user_context)
    # Allow either {"user_context": {...}} or direct {...}
    if "user_context" in ctx_raw and isinstance(ctx_raw["user_context"], dict):
      ctx_raw = ctx_raw["user_context"]
    user_ctx = UserContext.model_validate(ctx_raw)
  except Exception as exc:
    raise HTTPException(
      status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
      detail=f"Invalid user_context JSON: {exc}",
    ) from exc

  image_bytes = await image.read()
  if not image_bytes:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image upload is empty.")

  score = await score_with_ai(image_bytes, user_ctx)

  # Persist outfit + score + suggestions
  outfit = Outfit(
    user_id=None,
    source="upload",
    image_url="uploaded://not-stored",
    notes=None,
    is_example=False,
  )
  if user_ctx.user_id:
    outfit.user_id = user_ctx.user_id
  db.add(outfit)
  await db.flush()

  db.add(
    OutfitScore(
      outfit_id=outfit.id,
      color_match=score.breakdown.color_match,
      fit_quality=score.breakdown.fit_quality,
      body_compatibility=score.breakdown.body_compatibility,
      trend_score=score.breakdown.trend_score,
      style_match=score.breakdown.style_match,
      drip_score=score.drip_score,
      model_version="clip+llama",
    )
  )

  db.add(
    DripScoreHistory(
      user_id=user_ctx.user_id,
      outfit_id=outfit.id,
      drip_score=score.drip_score,
    )
  )

  for idx, suggestion in enumerate(score.suggestions, start=1):
    try:
      sug_type = SuggestionTypeEnum(suggestion.type.lower())
    except Exception:
      sug_type = SuggestionTypeEnum.other
    db.add(
      OutfitSuggestion(
        outfit_id=outfit.id,
        type=sug_type,
        title=suggestion.title,
        description=suggestion.description,
        rank=idx,
      )
    )

  await db.commit()
  await db.refresh(outfit)

  return score
