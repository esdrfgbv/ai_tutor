import random
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.enums import Difficulty, QuestionType
from app.models.models import ProgressTracking, Question, QuestionBank, Quiz, QuizAttempt, StudentProfile
from app.services.leaderboard_service import clamp_percent
from app.services.mock_test_service import mock_test_service
from app.services.progress_service import progress_service


SUBJECT_MAP = {
    "math": "maths",
    "maths": "maths",
    "english": "english",
    "science": "science",
    "reasoning": "mental-ability",
    "mental-ability": "mental-ability",
    "mental ability": "mental-ability",
}


class DiagnosticService:
    QUESTION_COUNT = 15

    def start_diagnostic(self, db: Session, student: StudentProfile, subject: str) -> Quiz:
        mapped = SUBJECT_MAP.get(subject, subject)
        grade = student.grade
        questions = list(
            db.query(QuestionBank)
            .filter(
                QuestionBank.grade == grade,
                QuestionBank.subject == mapped,
                QuestionBank.question_type == QuestionType.mcq,
            )
            .order_by(text("RAND()"))
            .limit(self.QUESTION_COUNT)
            .all()
        )

        if not questions:
            existing_quiz_ids = (
                db.query(Quiz.id)
                .filter(Quiz.grade == grade, Quiz.subject == mapped, Quiz.is_published == True)
                .all()
            )
            if existing_quiz_ids:
                qids = [r[0] for r in existing_quiz_ids]
                questions = (
                    db.query(Question)
                    .filter(Question.quiz_id.in_(qids))
                    .order_by(text("RAND()"))
                    .limit(self.QUESTION_COUNT)
                    .all()
                )

        if not questions:
            questions = self._generate_sample_questions(subject, grade)

        quiz = Quiz(
            title=f"Diagnostic - {subject.title()}",
            grade=grade,
            subject=mapped,
            quiz_type="diagnostic",
            duration_minutes=30,
            is_published=True,
        )
        db.add(quiz)
        db.flush()

        for src in questions:
            db.add(
                Question(
                    quiz_id=quiz.id,
                    question_type=QuestionType.mcq,
                    prompt=src.prompt if hasattr(src, "prompt") else src["prompt"],
                    options=src.options if hasattr(src, "options") else src.get("options", []),
                    correct_answer=src.correct_answer if hasattr(src, "correct_answer") else src["correct_answer"],
                    textbook_explanation=getattr(src, "textbook_explanation", ""),
                    ai_explanation=getattr(src, "ai_explanation", ""),
                    difficulty=getattr(src, "difficulty", Difficulty.medium),
                )
            )

        db.commit()
        db.refresh(quiz)
        return quiz

    def evaluate(
        self,
        db: Session,
        student: StudentProfile,
        quiz_id: int,
        answers: dict[str, str],
        seconds: int,
    ) -> dict:
        quiz = db.get(Quiz, quiz_id)
        if not quiz:
            raise ValueError("Quiz not found")

        correct = 0
        total = len(quiz.questions) if quiz else 0
        subject_breakdown: dict[str, dict] = {}
        difficulty_breakdown: dict[str, dict] = {}

        for question in quiz.questions or []:
            submitted = str(answers.get(str(question.id), "")).strip().lower()
            expected = str(question.correct_answer).strip().lower()
            is_correct = self._is_correct(submitted, expected)
            if is_correct:
                correct += 1

            diff_key = question.difficulty.value if question.difficulty else "medium"
            if diff_key not in difficulty_breakdown:
                difficulty_breakdown[diff_key] = {"total": 0, "correct": 0}
            difficulty_breakdown[diff_key]["total"] += 1
            if is_correct:
                difficulty_breakdown[diff_key]["correct"] += 1

        accuracy = clamp_percent((correct / total) * 100) if total else 0

        attempt = QuizAttempt(
            student_id=student.id,
            quiz_id=quiz_id,
            answers=answers,
            score=correct,
            accuracy=accuracy,
            time_taken_seconds=seconds,
        )
        student.total_points += int(correct * 10)
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        recommendations = self._generate_recommendations(accuracy, difficulty_breakdown)

        return {
            "attempt_id": attempt.id,
            "quiz_id": quiz_id,
            "subject": quiz.subject,
            "score": correct,
            "total": total,
            "accuracy": accuracy,
            "time_taken_seconds": seconds,
            "difficulty_breakdown": [
                {"difficulty": k, "total": v["total"], "correct": v["correct"]}
                for k, v in difficulty_breakdown.items()
            ],
            "recommendations": recommendations,
            "created_at": attempt.created_at.isoformat() if attempt.created_at else datetime.utcnow().isoformat(),
        }

    def get_history(self, db: Session, student: StudentProfile, limit: int = 10) -> list[dict]:
        rows = (
            db.query(QuizAttempt)
            .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
            .filter(
                QuizAttempt.student_id == student.id,
                Quiz.quiz_type == "diagnostic",
            )
            .order_by(QuizAttempt.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": r.id,
                "quiz_id": r.quiz_id,
                "subject": r.quiz.subject if r.quiz else None,
                "score": r.score,
                "total": len(r.quiz.questions) if r.quiz and r.quiz.questions else 0,
                "accuracy": r.accuracy,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]

    def _is_correct(self, submitted: str, expected: str) -> bool:
        if submitted == expected:
            return True
        if len(expected) == 1 and submitted.startswith(f"{expected})"):
            return True
        if submitted and submitted[0] == expected[:1]:
            return True
        return False

    def _generate_recommendations(self, accuracy: float, difficulty_breakdown: dict) -> list[str]:
        recs = []
        if accuracy < 40:
            recs.append("Focus on building foundational concepts before attempting advanced topics.")
            recs.append("Review NCERT textbook chapters for your weak subjects.")
        elif accuracy < 70:
            recs.append("Good progress! Practice more PYQ papers to improve speed and accuracy.")
            recs.append("Identify specific chapters where you lose marks and revise them.")
        else:
            recs.append("Excellent! Focus on time management and attempt full-length mock tests.")
            recs.append("Challenge yourself with higher difficulty questions.")

        hard = difficulty_breakdown.get("hard", {})
        if hard.get("total", 0) > 0 and hard.get("correct", 0) < hard.get("total", 0) * 0.5:
            recs.append("Spend extra time on hard-difficulty topics marked in your progress tracker.")
        return recs

    def _generate_sample_questions(self, subject: str, grade: int) -> list[dict]:
        samples = {
            "math": [
                {"prompt": "What is the LCM of 12 and 18?", "options": ["24", "36", "48", "72"], "correct_answer": "36", "difficulty": Difficulty.medium},
                {"prompt": "If a train travels 120 km in 2 hours, what is its speed?", "options": ["50 km/h", "60 km/h", "70 km/h", "80 km/h"], "correct_answer": "60 km/h", "difficulty": Difficulty.easy},
                {"prompt": "What is 15% of 200?", "options": ["25", "30", "35", "40"], "correct_answer": "30", "difficulty": Difficulty.easy},
                {"prompt": "Find the area of a circle with radius 7 cm.", "options": ["144 cm²", "154 cm²", "164 cm²", "174 cm²"], "correct_answer": "154 cm²", "difficulty": Difficulty.medium},
                {"prompt": "Simplify: (2³ × 3²) ÷ 6", "options": ["8", "10", "12", "14"], "correct_answer": "12", "difficulty": Difficulty.medium},
                {"prompt": "What is the square root of 196?", "options": ["12", "13", "14", "16"], "correct_answer": "14", "difficulty": Difficulty.easy},
                {"prompt": "A bag has 5 red and 3 blue balls. Probability of picking red?", "options": ["3/8", "5/8", "5/3", "3/5"], "correct_answer": "5/8", "difficulty": Difficulty.medium},
                {"prompt": "Solve: 2x + 5 = 17", "options": ["5", "6", "7", "8"], "correct_answer": "6", "difficulty": Difficulty.easy},
                {"prompt": "What is the HCF of 36 and 48?", "options": ["6", "8", "12", "16"], "correct_answer": "12", "difficulty": Difficulty.medium},
                {"prompt": "A number when divided by 7 leaves remainder 4. Which could be the number?", "options": ["39", "42", "45", "49"], "correct_answer": "39", "difficulty": Difficulty.hard},
                {"prompt": "Find the perimeter of a rectangle 12 cm long and 8 cm wide.", "options": ["20 cm", "40 cm", "96 cm", "36 cm"], "correct_answer": "40 cm", "difficulty": Difficulty.easy},
                {"prompt": "What is the mean of 6, 8, 10, 12, 14?", "options": ["8", "10", "12", "14"], "correct_answer": "10", "difficulty": Difficulty.easy},
                {"prompt": "Ratio 3:5 is equivalent to?", "options": ["6:8", "9:15", "12:18", "15:20"], "correct_answer": "9:15", "difficulty": Difficulty.medium},
                {"prompt": "What is the value of 0.25 × 0.4?", "options": ["0.01", "0.1", "1.0", "0.001"], "correct_answer": "0.1", "difficulty": Difficulty.medium},
                {"prompt": "The sum of three consecutive numbers is 72. The smallest number is?", "options": ["22", "23", "24", "25"], "correct_answer": "23", "difficulty": Difficulty.hard},
            ],
            "english": [
                {"prompt": "Choose the correct spelling:", "options": ["Accomodate", "Accommodate", "Acomodate", "Accomoddate"], "correct_answer": "Accommodate", "difficulty": Difficulty.medium},
                {"prompt": "The plural of 'child' is:", "options": ["childs", "childes", "children", "childrens"], "correct_answer": "children", "difficulty": Difficulty.easy},
                {"prompt": "Identify the noun: 'She runs quickly.'", "options": ["She", "runs", "quickly", "None"], "correct_answer": "None", "difficulty": Difficulty.medium},
                {"prompt": "Antonym of 'bright':", "options": ["Shiny", "Dark", "Light", "Glow"], "correct_answer": "Dark", "difficulty": Difficulty.easy},
                {"prompt": "Correct sentence:", "options": ["He go to school", "He goes to school", "He going to school", "He gone to school"], "correct_answer": "He goes to school", "difficulty": Difficulty.easy},
                {"prompt": "Synonym of 'happy':", "options": ["Sad", "Angry", "Joyful", "Tired"], "correct_answer": "Joyful", "difficulty": Difficulty.easy},
                {"prompt": "Which is an adverb?", "options": ["Swift", "Swiftly", "Swifted", "Swifting"], "correct_answer": "Swiftly", "difficulty": Difficulty.medium},
                {"prompt": "Choose the correct preposition: 'He is good ___ maths.'", "options": ["in", "at", "on", "with"], "correct_answer": "at", "difficulty": Difficulty.medium},
                {"prompt": "Which word is an adjective?", "options": ["Beautiful", "Beautifully", "Beauty", "Beautify"], "correct_answer": "Beautiful", "difficulty": Difficulty.easy},
                {"prompt": "Change to passive: 'The cat chased the mouse.'", "options": ["The mouse chased the cat", "The mouse was chased by the cat", "The cat was chased", "None"], "correct_answer": "The mouse was chased by the cat", "difficulty": Difficulty.hard},
                {"prompt": "Which is a compound word?", "options": ["Happiness", "Sunlight", "Running", "Quickly"], "correct_answer": "Sunlight", "difficulty": Difficulty.medium},
                {"prompt": "Identify the tense: 'She has finished her work.'", "options": ["Simple past", "Present perfect", "Past perfect", "Future perfect"], "correct_answer": "Present perfect", "difficulty": Difficulty.hard},
                {"prompt": "Fill in the blanks: 'Neither the teacher ___ the students were present.'", "options": ["or", "nor", "and", "but"], "correct_answer": "nor", "difficulty": Difficulty.medium},
                {"prompt": "Which is a conjunction?", "options": ["Because", "Quickly", "Beautiful", "Run"], "correct_answer": "Because", "difficulty": Difficulty.easy},
                {"prompt": "Correct the sentence: 'Each of the boys have a book.'", "options": ["Each of the boys has a book", "Each of the boy have a book", "Each of the boys had have a book", "None"], "correct_answer": "Each of the boys has a book", "difficulty": Difficulty.hard},
            ],
            "science": [
                {"prompt": "Which gas do plants absorb during photosynthesis?", "options": ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], "correct_answer": "Carbon dioxide", "difficulty": Difficulty.easy},
                {"prompt": "What is the unit of force?", "options": ["Watt", "Newton", "Joule", "Pascal"], "correct_answer": "Newton", "difficulty": Difficulty.easy},
                {"prompt": "What is the chemical symbol for Gold?", "options": ["Go", "Gd", "Au", "Ag"], "correct_answer": "Au", "difficulty": Difficulty.easy},
                {"prompt": "Which planet is known as the Red Planet?", "options": ["Venus", "Jupiter", "Mars", "Saturn"], "correct_answer": "Mars", "difficulty": Difficulty.easy},
                {"prompt": "What is the largest organ in the human body?", "options": ["Liver", "Heart", "Skin", "Brain"], "correct_answer": "Skin", "difficulty": Difficulty.medium},
                {"prompt": "Which vitamin is produced by sunlight?", "options": ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"], "correct_answer": "Vitamin D", "difficulty": Difficulty.easy},
                {"prompt": "What is the pH of pure water?", "options": ["5", "6", "7", "8"], "correct_answer": "7", "difficulty": Difficulty.easy},
                {"prompt": "Which gas is used in weather balloons?", "options": ["Hydrogen", "Helium", "Nitrogen", "Oxygen"], "correct_answer": "Helium", "difficulty": Difficulty.medium},
                {"prompt": "What causes the change of seasons?", "options": ["Earth's rotation", "Earth's revolution", "Earth's tilt", "Moon's gravity"], "correct_answer": "Earth's tilt", "difficulty": Difficulty.hard},
                {"prompt": "Which is a pure substance?", "options": ["Air", "Salt solution", "Copper", "Milk"], "correct_answer": "Copper", "difficulty": Difficulty.medium},
                {"prompt": "What is the SI unit of electric current?", "options": ["Volt", "Ampere", "Ohm", "Watt"], "correct_answer": "Ampere", "difficulty": Difficulty.medium},
                {"prompt": "Which blood cells fight infection?", "options": ["Red blood cells", "White blood cells", "Platelets", "Plasma"], "correct_answer": "White blood cells", "difficulty": Difficulty.easy},
                {"prompt": "What is the chemical formula of water?", "options": ["H₂O", "CO₂", "NaCl", "HCl"], "correct_answer": "H₂O", "difficulty": Difficulty.easy},
                {"prompt": "Which of these is a non-renewable resource?", "options": ["Solar energy", "Wind energy", "Coal", "Water"], "correct_answer": "Coal", "difficulty": Difficulty.medium},
                {"prompt": "What is the speed of light approximately?", "options": ["3 × 10⁶ m/s", "3 × 10⁸ m/s", "3 × 10¹⁰ m/s", "3 × 10⁴ m/s"], "correct_answer": "3 × 10⁸ m/s", "difficulty": Difficulty.hard},
            ],
            "reasoning": [
                {"prompt": "Find the odd one out: 2, 4, 8, 10, 16", "options": ["2", "4", "8", "10"], "correct_answer": "10", "difficulty": Difficulty.easy},
                {"prompt": "Next in series: 1, 4, 9, 16, _?", "options": ["20", "25", "32", "36"], "correct_answer": "25", "difficulty": Difficulty.easy},
                {"prompt": "If MONTH = 50, then YEAR = ?", "options": ["40", "45", "48", "52"], "correct_answer": "48", "difficulty": Difficulty.medium},
                {"prompt": "A is B's father. B is C's sister. A is C's ___?", "options": ["Brother", "Father", "Uncle", "Cousin"], "correct_answer": "Father", "difficulty": Difficulty.easy},
                {"prompt": "Mirror image of 'P' looks like?", "options": ["P", "d", "q", "b"], "correct_answer": "d", "difficulty": Difficulty.medium},
                {"prompt": "Which number replaces '?': 3, 6, 11, 18, 27, ?", "options": ["34", "36", "38", "40"], "correct_answer": "38", "difficulty": Difficulty.medium},
                {"prompt": "Find the odd one: Apple, Mango, Potato, Orange", "options": ["Apple", "Mango", "Potato", "Orange"], "correct_answer": "Potato", "difficulty": Difficulty.easy},
                {"prompt": "If 'PEN' is coded as 'QFO', how is 'INK' coded?", "options": ["JOL", "JML", "KOL", "JOM"], "correct_answer": "JOL", "difficulty": Difficulty.medium},
                {"prompt": "How many triangles in a pentagon with all diagonals?", "options": ["5", "10", "15", "20"], "correct_answer": "10", "difficulty": Difficulty.hard},
                {"prompt": "If South-East becomes North, what does North-West become?", "options": ["South", "East", "South-East", "South-West"], "correct_answer": "South", "difficulty": Difficulty.hard},
                {"prompt": "Complete the series: Z, X, V, T, R, ?", "options": ["P", "Q", "O", "N"], "correct_answer": "P", "difficulty": Difficulty.medium},
                {"prompt": "A man walks 5 km East, turns right and walks 3 km, then right again walks 5 km. How far from start?", "options": ["2 km", "3 km", "5 km", "8 km"], "correct_answer": "3 km", "difficulty": Difficulty.medium},
                {"prompt": "Which does not belong? Iron, Copper, Wood, Silver", "options": ["Iron", "Copper", "Wood", "Silver"], "correct_answer": "Wood", "difficulty": Difficulty.easy},
                {"prompt": "If 3×4=19, 5×6=41, then 7×8=?", "options": ["63", "65", "57", "71"], "correct_answer": "71", "difficulty": Difficulty.hard},
                {"prompt": "What comes next: A, C, F, J, ?", "options": ["K", "L", "M", "N"], "correct_answer": "M", "difficulty": Difficulty.hard},
            ],
        }
        mapped = SUBJECT_MAP.get(subject, subject)
        pool = samples.get(subject, samples.get(mapped, samples["math"]))
        random.shuffle(pool)
        return pool[: self.QUESTION_COUNT]


diagnostic_service = DiagnosticService()
