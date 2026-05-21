from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import assert_parent_can_access_child, get_current_user, get_student_profile, require_roles
from app.db.session import get_db
from app.models.enums import Role
from app.models.models import StudentProfile, User
from app.schemas.schemas import DashboardStats
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/student", response_model=DashboardStats)
def student_dashboard(student: StudentProfile = Depends(get_student_profile), db: Session = Depends(get_db)):
    return analytics_service.student_dashboard(db, student)


@router.get("/student/{student_id}", response_model=DashboardStats)
def child_dashboard(student_id: int, user: User = Depends(require_roles(Role.parent, Role.admin)), db: Session = Depends(get_db)):
    assert_parent_can_access_child(db, user, student_id)
    student = db.get(StudentProfile, student_id)
    if not student:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Student not found")
    return analytics_service.student_dashboard(db, student)


@router.get("/admin")
def admin_dashboard(_: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    return analytics_service.admin_overview(db)
