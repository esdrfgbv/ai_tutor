#!/usr/bin/env python3
"""
Complete request flow test
Simulates: Login -> Get Analytics -> Check response
"""
import sys
sys.path.insert(0, '.')

from app.core.security import hash_password, create_access_token, decode_token
from app.db.session import SessionLocal, Base, engine
from app.models.models import User, StudentProfile
from app.models.enums import Role
from app.services.analytics_service import analytics_service

print("=" * 70)
print("COMPLETE REQUEST FLOW TEST")
print("=" * 70)

# Setup database
Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Find or create a test student
test_email = "test.student@jnvprep.local"
student_user = db.query(User).filter(User.email == test_email).first()

if not student_user:
    print("\n[1] Creating test student user...")
    student_user = User(
        email=test_email,
        full_name="Test Student",
        hashed_password=hash_password("Test@12345"),
        role=Role.student,
        is_active=True,
    )
    db.add(student_user)
    db.flush()
    print(f"[OK] Created user: {student_user.id}")
else:
    print(f"\n[1] Found existing user: {student_user.id}")

# Ensure student profile exists
student_profile = student_user.student_profile
if not student_profile:
    print("[2] Creating student profile...")
    student_profile = StudentProfile(user_id=student_user.id, grade=9, target_exam="JNV")
    db.add(student_profile)
    db.flush()
    print(f"[OK] Created student profile: {student_profile.id}")
else:
    print(f"[2] Found existing profile: {student_profile.id}")

db.commit()

print("\n[3] Testing analytics endpoint...")
try:
    stats = analytics_service.student_dashboard(db, student_profile)
    print("[OK] Analytics endpoint returned data")
    print(f"\n  Response structure:")
    print(f"    - accuracy: {stats.accuracy}")
    print(f"    - quizzes_taken: {stats.quizzes_taken}")
    print(f"    - study_minutes: {stats.study_minutes}")
    print(f"    - streak_days: {stats.streak_days}")
    print(f"    - weak_topics: {len(stats.weak_topics)} topics")
    print(f"    - trend: {len(stats.trend)} data points")
    print(f"    - recommendations: {len(stats.recommendations)} items")
    print(f"    - subject_performance: {len(stats.subject_performance)} subjects")
    
    # Check if we can serialize to JSON
    stats_dict = stats.model_dump()
    print(f"\n[OK] Successfully serialized to dict ({len(stats_dict)} keys)")
except Exception as e:
    print(f"[ERROR] Analytics endpoint failed: {e}")
    import traceback
    traceback.print_exc()

print("\n[4] Testing JWT token flow...")
try:
    access_token = create_access_token(str(student_user.id), student_user.role.value)
    print(f"[OK] Created access token: {access_token[:20]}...")
    
    decoded = decode_token(access_token)
    print(f"[OK] Decoded token: sub={decoded['sub']}, type={decoded['type']}")
except Exception as e:
    print(f"[ERROR] Token flow failed: {e}")
    import traceback
    traceback.print_exc()

db.close()

print("\n" + "=" * 70)
print("All tests completed")
print("=" * 70)
