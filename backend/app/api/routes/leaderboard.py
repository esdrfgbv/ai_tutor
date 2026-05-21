from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.schemas import LeaderboardRow
from app.services.leaderboard_service import leaderboard_service

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=list[LeaderboardRow])
def leaderboard(db: Session = Depends(get_db), grade: int | None = None, subject: str | None = None, limit: int = 50):
    return leaderboard_service.build(db, grade=grade, subject=subject, limit=min(limit, 200))
