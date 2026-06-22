from __future__ import annotations

import re
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import exam_dir_name, get_settings
from app.models.knowledge_models import KnowledgeDocument


class ModuleService:
    @staticmethod
    def normalize_chapter_name(name: str) -> str:
        name = name.lower()
        name = name.replace(".pdf", "")
        name = re.sub(r"^chapter-\d+-", "", name)
        name = re.sub(r"\s+test\s*[-_]?\s*\d*$", "", name)
        name = name.replace("-", " ")
        name = re.sub(r"[^a-z0-9\s]", "", name)
        name = re.sub(r"\s+", " ", name).strip()
        return name

    def get_pdf_modules(
        self,
        subject: str,
        grade: int | None = None,
        target_exam: str = "JNV",
        db: Session | None = None,
    ) -> dict[str, dict]:
        """Discover modules from KB documents and filesystem PDFs (merged)."""
        normalized = subject.lower().strip()
        modules: dict[str, dict] = {}
        order_counter = 0

        # 1) KB — only documents with a chapter assigned
        if db and grade:
            docs = (
                db.query(KnowledgeDocument)
                .filter(
                    KnowledgeDocument.doc_class == str(grade),
                    KnowledgeDocument.doc_subject == normalized,
                    KnowledgeDocument.doc_chapter.isnot(None),
                    KnowledgeDocument.is_deleted.is_(False),
                )
                .order_by(KnowledgeDocument.id)
                .all()
            )
            for doc in docs:
                order_counter += 1
                norm = self.normalize_chapter_name(
                    doc.original_file_name or doc.file_name
                )
                if norm not in modules:
                    modules[norm] = {
                        "order": order_counter,
                        "source_pdf": doc.original_file_name or doc.file_name,
                        "display_name": (
                            doc.doc_chapter
                            or Path(doc.original_file_name).stem.replace("-", " ").title()
                        ),
                    }

        # 2) Filesystem (adds PDFs not already covered by KB)
        root = get_settings().source_root
        pdf_dir = root / exam_dir_name(target_exam) / f"class_{grade}" / normalized
        if pdf_dir.exists():
            def sort_key(path: Path) -> int:
                match = re.search(r"^chapter-(\d+)-", path.name.lower())
                return int(match.group(1)) if match else 999

            for file_path in sorted(pdf_dir.glob("*.pdf"), key=sort_key):
                filename = file_path.name
                norm = self.normalize_chapter_name(filename)
                if norm in modules:
                    continue
                order_counter += 1
                match = re.search(r"^chapter-(\d+)-", filename.lower())
                order = int(match.group(1)) if match else 999
                modules[norm] = {
                    "order": order,
                    "source_pdf": filename,
                    "display_name": norm.title(),
                }

        return modules

    def group_quizzes_by_module(
        self,
        subject: str,
        raw_tests: list[dict],
        grade: int | None = None,
        target_exam: str = "JNV",
        db: Session | None = None,
    ) -> list[dict]:
        pdf_modules = self.get_pdf_modules(subject, grade, target_exam=target_exam, db=db)
        grouped = {}
        mixed_group = []

        sorted_modules = sorted(pdf_modules.items(), key=lambda item: item[1]["order"])
        sorted_modules = sorted(sorted_modules, key=lambda item: len(item[0]), reverse=True)

        for test in raw_tests:
            raw_name = test["test_name"]
            normalized = self.normalize_chapter_name(raw_name)
            match_found = False

            for mod_norm, mod_data in sorted_modules:
                if normalized == mod_norm:
                    match_found = True
                elif normalized.startswith(mod_norm + " ") or normalized.endswith(" " + mod_norm) or f" {mod_norm} " in normalized:
                    match_found = True
                elif mod_norm in normalized:
                    match_found = True
                else:
                    continue

                if mod_norm not in grouped:
                    grouped[mod_norm] = {
                        "module_name": mod_data["display_name"],
                        "module_order": mod_data["order"],
                        "normalized_name": mod_norm,
                        "source_pdf": mod_data["source_pdf"],
                        "quizzes": [],
                    }
                grouped[mod_norm]["quizzes"].append(test)
                break

            if not match_found:
                mixed_group.append(test)

        result = []
        for mod_norm, mod_group in grouped.items():
            quizzes = sorted(mod_group["quizzes"], key=lambda x: x["test_name"])
            display_quizzes = []
            for idx, q in enumerate(quizzes):
                display_quizzes.append({
                    "raw_test_name": q["test_name"],
                    "display_name": f"Quiz {idx + 1}",
                    "question_count": q["question_count"],
                })
            mod_group["quizzes"] = display_quizzes
            result.append(mod_group)

        result.sort(key=lambda x: x["module_order"])

        if mixed_group:
            mixed_quizzes = sorted(mixed_group, key=lambda x: x["test_name"])
            display_mixed = []
            for idx, q in enumerate(mixed_quizzes):
                display_mixed.append({
                    "raw_test_name": q["test_name"],
                    "display_name": f"Practice Set {idx + 1}",
                    "question_count": q["question_count"],
                })
            result.append({
                "module_name": "Mixed Practice",
                "module_order": 9999,
                "normalized_name": "mixed practice",
                "source_pdf": None,
                "quizzes": display_mixed,
            })

        return result


module_service = ModuleService()
