import re
from pathlib import Path

from app.core.config import get_settings

CHAPTER_FILE_PATTERN = re.compile(r"^chapter-(\d+)-(.+)\.pdf$", re.IGNORECASE)
VALID_SUBJECTS = {"maths", "science", "english", "mental-ability"}


def get_subject_dir(subject: str, grade: int | None = None) -> Path:
    normalized = subject.lower().strip()
    folder_name = "class 6" if grade == 6 else "class_9"
    return get_settings().source_root / folder_name / normalized


def slugify(name: str) -> str:
    slug = name.lower().strip()
    if slug.endswith(".pdf"):
        slug = slug[:-4]
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def parse_chapter_pdf(filename: str) -> tuple[int | None, str]:
    match = CHAPTER_FILE_PATTERN.match(filename)
    if not match:
        stem = Path(filename).stem
        return None, stem.replace("-", " ").title()
    chapter_number = int(match.group(1))
    title = match.group(2).replace("-", " ").strip().title()
    return chapter_number, title


class ChapterService:
    def list_modules(self, grade: int, subject: str) -> list[dict]:
        normalized = subject.lower().strip()
        if normalized not in VALID_SUBJECTS:
            return []
        subject_dir = get_subject_dir(normalized, grade)
        if not subject_dir.exists():
            return []
        modules: list[dict] = []
        for path in sorted(subject_dir.glob("*.pdf"), key=lambda p: p.name.lower()):
            chapter_number, title = parse_chapter_pdf(path.name)
            modules.append(
                {
                    "chapter_number": chapter_number or 0,
                    "title": title,
                    "file_path": str(path),
                    "file_name": path.name,
                    "slug": slugify(path.name),
                    "subject": normalized,
                    "grade": grade,
                }
            )
        modules.sort(key=lambda item: (item["chapter_number"], item["title"]))
        return modules

    def resolve_pdf(self, subject: str, slug: str) -> Path | None:
        normalized = subject.lower().strip()
        if normalized not in VALID_SUBJECTS:
            return None
        subject_dir = get_subject_dir(normalized)
        for path in subject_dir.glob("*.pdf"):
            if slugify(path.name) == slug:
                return path
        return None


chapter_service = ChapterService()
