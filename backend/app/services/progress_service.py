from sqlalchemy.orm import Session

from app.models.models import StudentModuleProgress, StudentProfile
from app.services.chapter_service import chapter_service


class ProgressService:
    def module_status(self, db: Session, student: StudentProfile, grade: int, subject: str) -> dict[int, dict]:
        modules = chapter_service.list_modules(grade, subject)
        existing = {
            row.chapter_number: row
            for row in db.query(StudentModuleProgress)
            .filter_by(student_id=student.id, grade=grade, subject=subject)
            .all()
        }
        status: dict[int, dict] = {}
        for index, module in enumerate(modules):
            chapter_number = module["chapter_number"] or (index + 1)
            row = existing.get(chapter_number)
            if not row and index == 0:
                unlocked = True
            elif row:
                unlocked = row.unlocked
            else:
                prev = modules[index - 1]["chapter_number"] or index
                prev_row = existing.get(prev)
                unlocked = bool(prev_row and prev_row.quiz_passed)
            status[chapter_number] = {
                "locked": not unlocked,
                "quiz_passed": bool(row.quiz_passed) if row else False,
            }
        return status

    def record_module_pass(self, db: Session, student: StudentProfile, grade: int, subject: str, chapter_number: int, slug: str, accuracy: float) -> None:
        row = (
            db.query(StudentModuleProgress)
            .filter_by(student_id=student.id, grade=grade, subject=subject, chapter_number=chapter_number)
            .first()
        )
        if not row:
            row = StudentModuleProgress(
                student_id=student.id,
                grade=grade,
                subject=subject,
                chapter_number=chapter_number,
                pdf_slug=slug,
                unlocked=True,
            )
            db.add(row)
        row.quiz_passed = accuracy >= 60 or row.quiz_passed
        row.best_accuracy = max(row.best_accuracy, min(100.0, accuracy))
        modules = chapter_service.list_modules(grade, subject)
        for index, module in enumerate(modules):
            number = module["chapter_number"] or (index + 1)
            if number == chapter_number + 1 or (index > 0 and (modules[index - 1]["chapter_number"] or index) == chapter_number):
                next_row = (
                    db.query(StudentModuleProgress)
                    .filter_by(student_id=student.id, grade=grade, subject=subject, chapter_number=number)
                    .first()
                )
                if not next_row:
                    next_row = StudentModuleProgress(
                        student_id=student.id,
                        grade=grade,
                        subject=subject,
                        chapter_number=number,
                        pdf_slug=module["slug"],
                        unlocked=row.quiz_passed,
                    )
                    db.add(next_row)
                elif row.quiz_passed:
                    next_row.unlocked = True
        db.commit()


progress_service = ProgressService()
