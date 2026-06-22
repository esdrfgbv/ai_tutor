from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import exam_dir_name, get_settings
from app.models.knowledge_models import KnowledgeDocument, MetadataRegistry
from app.services.knowledge.metadata_service import metadata_service

CHAPTER_FILE_PATTERN = None  # legacy — will be removed after module_service is updated


def get_subject_dir(subject: str, grade: int, target_exam: str = "JNV") -> Path:
    """Get the base source directory for a given subject (metadata-driven).
    Directories are organised as {exam_dir}/class_{grade}/{subject}/.
    """
    root = get_settings().source_root
    folder_name = f"class_{grade}"
    return root / exam_dir_name(target_exam) / folder_name / subject.lower().strip()


def slugify(name: str) -> str:
    import re
    slug = name.lower().strip()
    if slug.endswith(".pdf"):
        slug = slug[:-4]
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def parse_chapter_pdf(filename: str) -> tuple[int | None, str]:
    import re
    pattern = re.compile(r"^chapter-(\d+)-(.+)\.pdf$", re.IGNORECASE)
    match = pattern.match(filename)
    if not match:
        stem = Path(filename).stem
        return None, stem.replace("-", " ").title()
    chapter_number = int(match.group(1))
    title = match.group(2).replace("-", " ").strip().title()
    return chapter_number, title


class ChapterService:
    """Metadata-driven chapter/module service.

    Uses KnowledgeDocument DB records as primary source of chapter data.
    Falls back to filesystem scanning (class_*/<subject>/*.pdf) when KB is
    empty — supporting incremental migration without breaking existing flows.
    """

    def get_valid_subjects(
        self,
        target_exam: str = "JNV",
        db: Session | None = None,
    ) -> list[str]:
        """Return valid subject slugs from MetadataRegistry or filesystem."""
        if db:
            registry = metadata_service.get_field_values(db, "subject")
            if registry:
                return [s["value"] for s in registry if s.get("value")]

        known: set[str] = set()
        root = get_settings().source_root
        exam_root = root / exam_dir_name(target_exam)
        if not exam_root.exists():
            return sorted(known)
        for dir_name in ("class_9", "class_6"):
            dir_path = exam_root / dir_name
            if dir_path.exists():
                for item in dir_path.iterdir():
                    if item.is_dir() and "mock" not in item.name.lower():
                        known.add(item.name.lower().strip())
        return sorted(known)

    def list_modules(
        self,
        grade: int,
        subject: str,
        target_exam: str = "JNV",
        db: Session | None = None,
    ) -> list[dict]:
        """List chapters/modules for a grade+subject.

        Merges KnowledgeDocument records with filesystem PDFs.
        KB docs override filesystem entries with the same slug.
        """
        normalized = subject.lower().strip()
        seen_slugs: set[str] = set()
        modules: list[dict] = []

        # 1) Query KnowledgeDocument (KB) — only documents with a chapter assigned
        if db:
            docs = (
                db.query(KnowledgeDocument)
                .filter(
                    KnowledgeDocument.doc_class == str(grade),
                    KnowledgeDocument.doc_subject == normalized,
                    KnowledgeDocument.doc_chapter.isnot(None),
                    KnowledgeDocument.is_deleted.is_(False),
                )
                .order_by(KnowledgeDocument.doc_chapter, KnowledgeDocument.id)
                .all()
            )
            for doc in docs:
                slug = slugify(doc.original_file_name or doc.file_name)
                if slug in seen_slugs:
                    continue
                seen_slugs.add(slug)

                # Prefer title parsed from filename over raw doc_chapter
                file_name = doc.original_file_name or doc.file_name
                _, parsed_title = parse_chapter_pdf(file_name) if file_name else (None, None)
                title = parsed_title or doc.doc_chapter or Path(file_name).stem.replace("-", " ").title()

                modules.append({
                    "chapter_number": 0,
                    "title": title,
                    "file_path": doc.file_path,
                    "file_name": file_name,
                    "slug": slug,
                    "subject": normalized,
                    "grade": grade,
                    "kb_document_id": doc.id,
                })

        # 2) Filesystem scan (adds any PDFs not already covered by KB)
        subject_dir = get_subject_dir(normalized, grade, target_exam)
        if subject_dir.exists():
            for path in sorted(subject_dir.glob("*.pdf"), key=lambda p: p.name.lower()):
                slug = slugify(path.name)
                if slug in seen_slugs:
                    continue
                seen_slugs.add(slug)
                chapter_number, title = parse_chapter_pdf(path.name)
                modules.append({
                    "chapter_number": chapter_number or 0,
                    "title": title,
                    "file_path": str(path),
                    "file_name": path.name,
                    "slug": slug,
                    "subject": normalized,
                    "grade": grade,
                })

        modules.sort(key=lambda item: (item["chapter_number"], item["title"]))
        return modules

    def resolve_pdf(
        self,
        subject: str,
        slug: str,
        grade: int,
        target_exam: str = "JNV",
        db: Session | None = None,
    ) -> Path | None:
        """Resolve a PDF path by subject + slug + grade.

        Priority: KnowledgeDocument → filesystem glob.
        """
        normalized = subject.lower().strip()

        # 1) KB — only documents with a chapter assigned
        if db:
            doc = (
                db.query(KnowledgeDocument)
                .filter(
                    KnowledgeDocument.doc_subject == normalized,
                    KnowledgeDocument.doc_chapter.isnot(None),
                    KnowledgeDocument.original_file_name.ilike(f"%{slug}%"),
                    KnowledgeDocument.is_deleted.is_(False),
                )
                .first()
            )
            if doc:
                path = Path(doc.file_path)
                return path if path.exists() else None

        # 2) Filesystem fallback
        subject_dir = get_subject_dir(normalized, grade, target_exam)
        for path in subject_dir.glob("*.pdf"):
            if slugify(path.name) == slug:
                return path
        return None


chapter_service = ChapterService()
