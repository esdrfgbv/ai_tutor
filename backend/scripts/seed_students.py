"""
Seeder script: generates 100 realistic student accounts with learning & test histories.

Categories:
  - 20 Top Performers  (accuracy 80-98%, high engagement)
  - 40 Average Students (accuracy 50-75%, medium engagement)
  - 30 Weak Students    (accuracy 20-50%, low engagement)
  - 10 New Students     (recent, minimal activity)

Usage:
  python -m scripts.seed_students [--clear]
"""

import argparse
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.enums import Difficulty, Role
from app.models.models import (
    Chapter,
    ProgressTracking,
    Question,
    Quiz,
    QuizAttempt,
    StudentProfile,
    StudySession,
    User,
)

STATES = [
    "Uttar Pradesh", "Maharashtra", "Bihar", "West Bengal", "Madhya Pradesh",
    "Tamil Nadu", "Rajasthan", "Karnataka", "Gujarat", "Andhra Pradesh",
    "Odisha", "Telangana", "Kerala", "Jharkhand", "Assam",
    "Punjab", "Haryana", "Chhattisgarh", "Delhi", "Jammu and Kashmir",
]

DISTRICTS_BY_STATE = {
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Ghaziabad", "Bareilly", "Aligarh", "Moradabad", "Gorakhpur"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Kolhapur", "Amravati", "Nanded"],
    "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Purnia", "Saran", "Nalanda", "Siwan", "Madhubani"],
    "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Nadia", "Hooghly", "North 24 Parganas", "South 24 Parganas", "Bankura", "Malda", "Murshidabad"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode", "Vellore", "Thoothukudi", "Dindigul"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Bharatpur", "Alwar", "Sikar", "Nagaur"],
    "Karnataka": ["Bengaluru", "Mysuru", "Hubli", "Mangaluru", "Belagavi", "Davanagere", "Bellary", "Tumakuru", "Shivamogga", "Raichur"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Mehsana"],
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati", "Kakinada", "Anantapur", "Eluru"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Jharsuguda", "Baripada"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad", "Siddipet"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Alappuzha", "Kannur", "Kottayam", "Palakkad", "Malappuram"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Giridih", "Ramgarh", "Dumka", "Phusro"],
    "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon", "Barpeta", "Goalpara"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur", "Pathankot", "Moga", "Firozpur"],
    "Haryana": ["Faridabad", "Gurugram", "Panipat", "Ambala", "Karnal", "Sonipat", "Rohtak", "Hisar", "Yamunanagar", "Panchkula"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon", "Raigarh", "Jagdalpur", "Ambikapur", "Dhamtari"],
    "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "South Delhi", "West Delhi", "Shahdara", "North West Delhi", "South West Delhi", "South East Delhi"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Kathua", "Kupwara", "Pulwama", "Rajouri", "Poonch", "Udhampur"],
}

FIRST_NAMES = [
    "Arjun", "Aanya", "Rohan", "Priya", "Vikram", "Sneha", "Aditya", "Kavya",
    "Rahul", "Neha", "Amit", "Pooja", "Sachin", "Meera", "Deepak", "Anita",
    "Suresh", "Lakshmi", "Mohan", "Radha", "Vivek", "Geeta", "Nitin", "Shweta",
    "Harsh", "Divya", "Manish", "Ritu", "Sanjay", "Anjali", "Akash", "Pallavi",
    "Kunal", "Swati", "Gaurav", "Nandini", "Rajesh", "Deepika", "Pankaj", "Kirti",
    "Avinash", "Shalini", "Dinesh", "Bhavna", "Tarun", "Rekha", "Jatin", "Charu",
    "Ravi", "Sonia",
]

LAST_NAMES = [
    "Sharma", "Verma", "Singh", "Kumar", "Patel", "Gupta", "Reddy", "Yadav",
    "Joshi", "Mishra", "Pandey", "Rao", "Nair", "Menon", "Das", "Bose",
    "Sen", "Ghosh", "Banerjee", "Chatterjee", "Deshmukh", "Kulkarni", "Patil",
    "Jadhav", "Agarwal", "Saxena", "Srivastava", "Tiwari", "Dubey", "Tripathi",
    "Choudhary", "Rajput", "Thakur", "Solanki", "Prajapati", "Mehta", "Shah",
    "Modi", "Bhatt", "Pillai",
]

SCHOOL_PREFIXES = [
    "JNV", "Kendriya Vidyalaya", "Sainik School", "St. Mary's", "DAV",
    "DPS", "Delhi Public School", "Army Public School", "Mount Carmel",
]

def random_school():
    prefix = random.choice(SCHOOL_PREFIXES)
    city = random.choice(list(STATES))
    return f"{prefix} {city}"

def generate_students():
    db = SessionLocal()
    try:
        existing_students = db.query(StudentProfile).count()
        if existing_students >= 80:
            print(f"Database already has {existing_students} students. Use --clear to reset.")
            return

        chapters = db.query(Chapter).all()
        quizzes = db.query(Quiz).all()

        if not quizzes:
            print("No quizzes found. Creating sample quizzes first...")
            _create_sample_quizzes(db)

        quizzes = db.query(Quiz).all()
        chapters = db.query(Chapter).all()

        students_data = []
        now = datetime.utcnow()

        categories = (
            [("top", 20, 80, 98, 70, 150)] +
            [("average", 40, 50, 75, 30, 80)] +
            [("weak", 30, 20, 50, 10, 40)] +
            [("new", 10, 0, 30, 0, 15)]
        )

        student_index = 0
        for cat_name, count, min_acc, max_acc, min_sessions, max_sessions in categories:
            for _ in range(count):
                student_index += 1
                first = random.choice(FIRST_NAMES)
                last = random.choice(LAST_NAMES)
                name = f"{first} {last}"
                email = f"{first.lower()}.{last.lower()}{student_index}@student.prep100.local"
                state = random.choice(STATES)
                district = random.choice(DISTRICTS_BY_STATE[state])
                school = random_school()
                grade = random.choice([6, 9])
                target = "JNV" if grade == 6 else "Sainik"

                is_new = cat_name == "new"
                days_ago = random.randint(1, 5) if is_new else random.randint(20, 90)
                created = now - timedelta(days=days_ago)

                students_data.append({
                    "email": email,
                    "name": name,
                    "password": "Student@123",
                    "grade": grade,
                    "target_exam": target,
                    "state": state,
                    "district": district,
                    "school": school,
                    "city": district,
                    "section": random.choice(["A", "B", "C"]),
                    "medium": random.choice(["English", "Hindi"]),
                    "academic_year": "2026-2027",
                    "created": created,
                    "category": cat_name,
                    "min_acc": min_acc,
                    "max_acc": max_acc,
                    "min_sessions": min_sessions,
                    "max_sessions": max_sessions,
                    "is_new": is_new,
                })

        print(f"Creating {len(students_data)} student accounts...")
        created_users = []
        for sd in students_data:
            existing = db.query(User).filter(User.email == sd["email"]).first()
            if existing:
                continue

            user = User(
                email=sd["email"],
                full_name=sd["name"],
                hashed_password=hash_password(sd["password"]),
                role=Role.student,
                is_active=True,
                created_at=sd["created"],
                updated_at=sd["created"],
            )
            db.add(user)
            db.flush()

            profile = StudentProfile(
                user_id=user.id,
                grade=sd["grade"],
                target_exam=sd["target_exam"],
                school_name=sd["school"],
                state=sd["state"],
                district=sd["district"],
                city=sd["city"],
                section=sd["section"],
                medium=sd["medium"],
                academic_year=sd["academic_year"],
                normalized_school_name=sd["school"].lower().strip(),
                normalized_state=sd["state"].lower().strip(),
                streak_days=0,
                total_points=0,
                onboarding_completed=not sd["is_new"],
                created_at=sd["created"],
                updated_at=sd["created"],
            )
            db.add(profile)
            db.flush()

            created_users.append({"user": user, "profile": profile, "data": sd})
            print(f"  Created: {sd['email']} ({sd['category']})")

        db.commit()

        print(f"\nGenerating learning histories for {len(created_users)} students...")
        for cu in created_users:
            sd = cu["data"]
            _generate_history(db, cu["user"], cu["profile"], sd, chapters, quizzes, now)

        print(f"\nSeeding complete!")
        print(f"  Total students created: {len(created_users)}")
        print(f"  Top performers: {sum(1 for s in created_users if s['data']['category'] == 'top')}")
        print(f"  Average students: {sum(1 for s in created_users if s['data']['category'] == 'average')}")
        print(f"  Weak students: {sum(1 for s in created_users if s['data']['category'] == 'weak')}")
        print(f"  New students: {sum(1 for s in created_users if s['data']['category'] == 'new')}")
        print(f"  Default password for all: Student@123")

    finally:
        db.close()


def _generate_history(db, user, profile, sd, chapters, quizzes, now):
    if sd["is_new"]:
        return

    num_sessions = random.randint(sd["min_sessions"], sd["max_sessions"])
    for _ in range(num_sessions):
        days_ago = random.randint(0, min(60, (now - sd["created"]).days or 1))
        session_start = now - timedelta(days=days_ago, hours=random.randint(0, 12))
        duration = random.randint(300, 3600)
        session_type = random.choice(["pdf_reading", "quiz", "mock_test"])
        subject = random.choice(["maths", "science", "english", "mental-ability"])

        session = StudySession(
            student_id=profile.id,
            subject=subject,
            chapter=f"Chapter {random.randint(1, 12)}",
            started_at=session_start,
            ended_at=session_start + timedelta(seconds=duration),
            duration_seconds=duration,
            session_type=session_type,
            active_status=False,
            last_heartbeat_at=session_start + timedelta(seconds=duration),
            created_at=session_start,
            updated_at=session_start,
        )
        db.add(session)

    if chapters and quizzes:
        num_attempts = random.randint(max(1, sd["min_sessions"] // 5), max(2, num_sessions // 3))
        for _ in range(num_attempts):
            quiz = random.choice(quizzes)
            days_ago = random.randint(0, min(30, (now - sd["created"]).days or 1))
            attempt_time = now - timedelta(days=days_ago, hours=random.randint(0, 12))

            accuracy = random.uniform(sd["min_acc"] / 100, sd["max_acc"] / 100)
            total_q = len(quiz.questions) if quiz.questions else 10
            score = int(accuracy * total_q)
            time_taken = random.randint(120, 900)

            answers = {}
            for q in (quiz.questions or []):
                if random.random() < accuracy:
                    answers[str(q.id)] = q.correct_answer
                else:
                    if q.options and len(q.options) > 0:
                        wrong = [o for o in q.options if o != q.correct_answer]
                        answers[str(q.id)] = random.choice(wrong) if wrong else q.correct_answer
                    else:
                        answers[str(q.id)] = "A"

            attempt = QuizAttempt(
                student_id=profile.id,
                quiz_id=quiz.id,
                answers=answers,
                score=score,
                accuracy=accuracy * 100,
                time_taken_seconds=time_taken,
                created_at=attempt_time,
                updated_at=attempt_time,
            )
            db.add(attempt)
            profile.total_points += score * 10

    profile.streak_days = random.randint(0, sd["min_sessions"] // 5)
    profile.longest_streak = max(profile.streak_days, random.randint(1, sd["min_sessions"] // 3))

    if chapters:
        tracked = set()
        for _ in range(min(len(chapters), random.randint(2, 8))):
            ch = random.choice(chapters)
            if ch.id in tracked:
                continue
            tracked.add(ch.id)
            progress = ProgressTracking(
                student_id=profile.id,
                chapter_id=ch.id,
                completion_percentage=random.uniform(sd["min_acc"] / 100, sd["max_acc"] / 100),
                time_spent_minutes=random.randint(10, 120),
                mastery_score=random.uniform(sd["min_acc"] / 100, sd["max_acc"] / 100),
                created_at=sd["created"] + timedelta(days=random.randint(1, 10)),
                updated_at=now - timedelta(days=random.randint(0, 5)),
            )
            db.add(progress)

    db.commit()


def _create_sample_quizzes(db):
    subjects = ["maths", "science", "english", "mental-ability"]
    quiz_configs = [
        ("maths", "Number System", [("What is the place value of 5 in 4,56,789?", ["5000", "50000", "500000", "500"], "50000"), ("LCM of 12 and 18?", ["24", "36", "48", "72"], "36"), ("Which is prime?", ["15", "17", "21", "27"], "17"), ("15 × 8 - 12 ÷ 3?", ["116", "108", "120", "112"], "116"), ("Square root of 144?", ["10", "11", "12", "13"], "12")]),
        ("science", "Basic Science", [("Which gas do plants absorb?", ["Oxygen", "CO2", "Nitrogen", "Hydrogen"], "CO2"), ("Which organ pumps blood?", ["Liver", "Heart", "Lungs", "Brain"], "Heart"), ("What is H2O?", ["Salt", "Water", "Acid", "Base"], "Water"), ("Which planet is closest to sun?", ["Venus", "Earth", "Mercury", "Mars"], "Mercury"), ("What is the SI unit of force?", ["Newton", "Joule", "Watt", "Pascal"], "Newton")]),
        ("english", "Grammar", [("Which is a noun?", ["Run", "Beautiful", "Book", "Quickly"], "Book"), ("Correct: 'She ___ to school'", ["go", "goes", "going", "gone"], "goes"), ("Synonym of 'happy'?", ["Sad", "Angry", "Joyful", "Tired"], "Joyful"), ("Which is an adverb?", ["Swift", "Swiftly", "Swifted", "Swifting"], "Swiftly"), ("Antonym of 'bright'?", ["Shiny", "Dark", "Light", "Glow"], "Dark")]),
        ("mental-ability", "Reasoning", [("2, 4, 8, 16, ?", ["24", "32", "30", "36"], "32"), ("Which is odd: 2, 3, 5, 7, 9?", ["2", "3", "5", "9"], "9"), ("Mirror of 'P'?", ["P", "d", "q", "b"], "d"), ("A is B's father. B is C's sister. A is C's ___?", ["Brother", "Father", "Uncle", "Cousin"], "Father"), ("If MONTH = 50, then YEAR = ?", ["40", "45", "48", "52"], "48")]),
    ]

    for subject, quiz_name, questions_data in quiz_configs:
        quiz = Quiz(
            title=quiz_name,
            grade=6,
            subject=subject,
            chapter="1",
            quiz_type="module",
            duration_minutes=10,
            is_published=True,
        )
        db.add(quiz)
        db.flush()

        for prompt, options, answer in questions_data:
            q = Question(
                quiz_id=quiz.id,
                prompt=prompt,
                options=options,
                correct_answer=answer,
                textbook_explanation=f"The correct answer is {answer}.",
                ai_explanation=f"The correct answer is {answer}.",
                difficulty=Difficulty.medium,
            )
            db.add(q)
        print(f"  Created quiz: {subject} - {quiz_name}")

    db.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed 100 demo students")
    parser.add_argument("--clear", action="store_true", help="Clear existing student data first")
    args = parser.parse_args()

    if args.clear:
        db = SessionLocal()
        try:
            students = (
                db.query(StudentProfile)
                .join(User, StudentProfile.user_id == User.id)
                .filter(User.role == Role.student)
                .all()
            )
            if not students:
                print("No student data to clear.")
                db.close()
                sys.exit(0)

            user_ids = [s.user_id for s in students]
            student_ids = [s.id for s in students]

            db.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
            db.flush()

            sid = ",".join(str(i) for i in student_ids)
            uid = ",".join(str(i) for i in user_ids)

            raw_sqls = [
                f"DELETE FROM quiz_timer_states WHERE student_id IN ({sid})",
                f"DELETE FROM achievements WHERE student_id IN ({sid})",
                f"DELETE FROM parent_child_links WHERE student_id IN ({sid})",
                f"DELETE FROM admin_mock_test_attempts WHERE student_id IN ({sid})",
                f"DELETE FROM quiz_attempts WHERE student_id IN ({sid})",
                f"DELETE FROM study_sessions WHERE student_id IN ({sid})",
                f"DELETE FROM student_module_progress WHERE student_id IN ({sid})",
                f"DELETE FROM progress_tracking WHERE student_id IN ({sid})",
                f"DELETE FROM study_bookmarks WHERE user_id IN ({uid})",
                f"DELETE FROM study_notes WHERE user_id IN ({uid})",
                f"DELETE FROM ai_conversations WHERE user_id IN ({uid})",
                f"DELETE FROM notifications WHERE user_id IN ({uid})",
                f"DELETE FROM analytics WHERE user_id IN ({uid})",
                f"DELETE FROM conversation_messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IN ({uid}))",
                f"DELETE FROM conversations WHERE user_id IN ({uid})",
                f"DELETE FROM students WHERE id IN ({sid})",
                f"DELETE FROM users WHERE id IN ({uid}) AND role = 'student'",
            ]
            for sql in raw_sqls:
                db.execute(text(sql))

            db.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
            db.commit()
            print(f"Cleared {len(student_ids)} student records.")
        finally:
            db.close()

    generate_students()
