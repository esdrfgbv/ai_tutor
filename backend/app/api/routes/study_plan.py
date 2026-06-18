from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_student_profile as get_current_student
from app.db.session import get_db
from app.models.models import StudentProfile
from app.services.study_plan_service import study_plan_service

router = APIRouter(prefix="/study-plan", tags=["study-plan"])


@router.get("")
def get_active_plan(
    db: Session = Depends(get_db),
    student: StudentProfile = Depends(get_current_student),
):
    plan = study_plan_service.get_active(db, student)
    if plan:
        return {"plan": plan.plan_data, "week_start": str(plan.week_start), "week_end": str(plan.week_end), "generated_by": plan.generated_by}
    return {"plan": None, "message": "No active study plan. Generate one via POST /study-plan/generate."}


@router.post("/generate")
def generate_plan(
    db: Session = Depends(get_db),
    student: StudentProfile = Depends(get_current_student),
):
    plan = study_plan_service.generate(db, student)
    return {"plan": plan.plan_data, "week_start": str(plan.week_start), "week_end": str(plan.week_end), "generated_by": plan.generated_by}


@router.get("/history")
def plan_history(
    db: Session = Depends(get_db),
    student: StudentProfile = Depends(get_current_student),
):
    plans = study_plan_service.get_history(db, student)
    return {
        "history": [
            {
                "week_start": str(p.week_start),
                "week_end": str(p.week_end),
                "generated_by": p.generated_by,
            }
            for p in plans
        ]
    }
