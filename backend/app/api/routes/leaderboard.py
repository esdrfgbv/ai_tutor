from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.schemas import LeaderboardRow, AdminLeaderboardResponse
from app.services.leaderboard_service import leaderboard_service

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=list[LeaderboardRow])
def leaderboard(db: Session = Depends(get_db), grade: int | None = None, subject: str | None = None, limit: int = 50):
    return leaderboard_service.build(db, grade=grade, subject=subject, limit=min(limit, 200))


@router.get("/admin", response_model=AdminLeaderboardResponse)
def admin_leaderboard(
    db: Session = Depends(get_db),
    page: int = 1,
    limit: int = 50,
    grade: int | None = None,
    subject: str | None = None,
    school_name: str | None = None,
    state: str | None = None,
    district: str | None = None,
    city: str | None = None,
    medium: str | None = None,
    section: str | None = None,
    sort_by: str = "highest_score",
):
    # Here we would normally inject a get_current_admin_user dependency
    return leaderboard_service.admin_build(
        db,
        page=page,
        limit=min(limit, 500),
        grade=grade,
        subject=subject,
        school_name=school_name,
        state=state,
        district=district,
        city=city,
        medium=medium,
        section=section,
        sort_by=sort_by
    )
