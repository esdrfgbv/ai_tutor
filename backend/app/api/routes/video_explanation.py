from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.models import User
from app.schemas.video_schemas import VideoRecommendationResponse
from app.services.video_explanation.video_service import VideoExplanationService

router = APIRouter()
video_service = VideoExplanationService()

@router.get("/{chapter_id}", response_model=VideoRecommendationResponse)
def get_recommendations(
    chapter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    recs = video_service.get_recommendations(db, chapter_id)
    if not recs:
        return VideoRecommendationResponse(status="not_found")
        
    return VideoRecommendationResponse(
        status="success",
        query=recs[0].query,
        language=recs[0].language,
        videos=recs
    )

@router.post("/generate/{chapter_id}", response_model=VideoRecommendationResponse)
async def generate_recommendations(
    chapter_id: int,
    pdf_url: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    recs = await video_service.generate_recommendations(db, chapter_id, pdf_url)
    if not recs:
        return VideoRecommendationResponse(status="failed")
        
    return VideoRecommendationResponse(
        status="success",
        query=recs[0].query,
        language=recs[0].language,
        videos=recs
    )

@router.delete("/cache/{chapter_id}")
def clear_cache(
    chapter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    video_service.clear_cache(db, chapter_id)
    return {"status": "success", "message": "Cache cleared"}
