
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import User, UserProfile, Outfit, OutfitScore, DripScoreHistory, StyleDNA
from app.schemas.profile import ProfileSyncRequest, ProfileSyncResponse, StyleDNAResponse

router = APIRouter(prefix="/v1/profile", tags=["profile"])


@router.post("/sync", response_model=ProfileSyncResponse)
async def sync_profile(payload: ProfileSyncRequest, db: AsyncSession = Depends(get_db)):
  user_id = payload.user_id

  # Upsert user
  if user_id:
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
  else:
    user = None

  if not user:
    user = User(
      id=user_id or None,
      email=payload.email,
      display_name=payload.display_name,
      avatar_url=payload.avatar_url,
    )
    db.add(user)
    await db.flush()
    user_id = str(user.id)
  else:
    if payload.email:
      user.email = payload.email
    if payload.display_name:
      user.display_name = payload.display_name
    if payload.avatar_url:
      user.avatar_url = payload.avatar_url

  # Upsert profile
  stmt = select(UserProfile).where(UserProfile.user_id == user_id)
  res = await db.execute(stmt)
  profile = res.scalar_one_or_none()
  if not profile:
    profile = UserProfile(
      user_id=user_id,
      style_preference=",".join(payload.style_preferences or []),
      height_cm=float(payload.user_height) if payload.user_height else None,
      body_type=payload.user_body_type,
      gender_style_preference=payload.gender_style_preference,
    )
    db.add(profile)
  else:
    profile.style_preference = ",".join(payload.style_preferences or [])
    profile.height_cm = float(payload.user_height) if payload.user_height else None
    profile.body_type = payload.user_body_type
    profile.gender_style_preference = payload.gender_style_preference

  await db.commit()
  return ProfileSyncResponse(user_id=user_id)


@router.get("/history", response_model=dict)
async def profile_history(user_id: str, db: AsyncSession = Depends(get_db)):
  """Return recent outfits and drip score history for a user."""
  if not user_id:
    raise HTTPException(status_code=400, detail="user_id is required")

  rec_stmt = (
    select(Outfit.id, Outfit.image_url, Outfit.scanned_at, OutfitScore.drip_score)
    .join(OutfitScore, OutfitScore.outfit_id == Outfit.id, isouter=True)
    .where(Outfit.user_id == user_id)
    .order_by(desc(Outfit.scanned_at))
    .limit(10)
  )
  rec_res = await db.execute(rec_stmt)
  recent = [
    {
      "id": str(r.id),
      "image_url": r.image_url,
      "scanned_at": r.scanned_at.isoformat() if r.scanned_at else None,
      "drip_score": float(r.drip_score) if r.drip_score is not None else None,
    }
    for r in rec_res.fetchall()
  ]

  hist_stmt = (
    select(DripScoreHistory.recorded_at, DripScoreHistory.drip_score)
    .where(DripScoreHistory.user_id == user_id)
    .order_by(desc(DripScoreHistory.recorded_at))
    .limit(30)
  )
  hist_res = await db.execute(hist_stmt)
  history = [
    {
      "recorded_at": r.recorded_at.isoformat() if r.recorded_at else None,
      "drip_score": float(r.drip_score) if r.drip_score is not None else None,
    }
    for r in hist_res.fetchall()
  ]

  return {"recent_outfits": recent, "history": list(reversed(history))}


@router.get("/style_dna", response_model=StyleDNAResponse)
async def style_dna(user_id: str, db: AsyncSession = Depends(get_db)):
  if not user_id:
    raise HTTPException(status_code=400, detail="user_id is required")

  # Try to load existing
  existing_stmt = select(StyleDNA).where(StyleDNA.user_id == user_id)
  res = await db.execute(existing_stmt)
  dna = res.scalar_one_or_none()

  # Quick aggregate heuristics
  score_stmt = (
    select(
      OutfitScore.drip_score,
      OutfitScore.color_match,
      OutfitScore.fit_quality,
      OutfitScore.body_compatibility,
      OutfitScore.trend_score,
      OutfitScore.style_match,
    )
    .join(Outfit, Outfit.id == OutfitScore.outfit_id)
    .where(Outfit.user_id == user_id)
    .order_by(desc(OutfitScore.created_at))
    .limit(20)
  )
  score_res = await db.execute(score_stmt)
  rows = score_res.fetchall()
  if rows:
    avg_drip = float(sum(r.drip_score or 0 for r in rows) / len(rows))
    avg_fit = float(sum(r.fit_quality or 0 for r in rows) / len(rows))
    avg_color = float(sum(r.color_match or 0 for r in rows) / len(rows))
    avg_trend = float(sum(r.trend_score or 0 for r in rows) / len(rows))
    tags = []
    if avg_fit >= 7: tags.append("fit-driven")
    if avg_color >= 7: tags.append("color-forward")
    if avg_trend >= 7: tags.append("on-trend")
    if avg_drip >= 8: tags.append("high-drip")
    label = "Refined street luxe" if "fit-driven" in tags else "Polished casual"
    description = f"Prefers tailored, body-aware looks with solid color coordination. Avg drip {avg_drip:.1f}."
  else:
    label = "Getting started"
    description = "Scan more outfits to build your Style DNA."
    tags = []

  if dna:
    dna.label = label
    dna.description = description
    dna.tags = tags
  else:
    dna = StyleDNA(user_id=user_id, label=label, description=description, tags=tags)
    db.add(dna)

  await db.commit()
  return StyleDNAResponse(user_id=user_id, label=dna.label or label, description=dna.description or description, tags=dna.tags or tags)
