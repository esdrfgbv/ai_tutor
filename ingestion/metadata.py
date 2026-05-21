import re
from pathlib import Path

from app.models.enums import Difficulty, SourceType


def infer_metadata(path: Path, source_root: Path) -> dict:
    relative = path.relative_to(source_root) if path.is_relative_to(source_root) else path
    normalized = str(relative).lower().replace("\\", "/")
    grade_match = re.search(r"class\s*(\d+)", normalized)
    year_match = re.search(r"(20\d{2})", normalized)
    chapter_match = re.search(r"chapter\s*\(?\s*(\d+)\s*\)?", normalized)
    subject = None
    for candidate in ["maths", "math", "science", "english", "gk", "reasoning"]:
        if candidate in normalized:
            subject = "maths" if candidate == "math" else candidate
            break
    if "pyq" in normalized or "aiseee" in normalized or "navodaya" in normalized:
        source_type = SourceType.pyq
    elif "notes" in normalized:
        source_type = SourceType.notes
    else:
        source_type = SourceType.textbook
    difficulty = Difficulty.medium
    if source_type == SourceType.pyq and year_match and int(year_match.group(1)) >= 2023:
        difficulty = Difficulty.hard
    chapter = f"Chapter {chapter_match.group(1)}" if chapter_match else path.stem.replace("-", " ").replace("_", " ").title()
    return {
        "file_path": str(path),
        "file_name": path.name,
        "grade": int(grade_match.group(1)) if grade_match else None,
        "subject": subject,
        "chapter": chapter,
        "topic": chapter,
        "source_type": source_type,
        "year": int(year_match.group(1)) if year_match else None,
        "difficulty": difficulty,
    }
