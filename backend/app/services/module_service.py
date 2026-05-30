import re
from pathlib import Path
from app.services.chapter_service import get_subject_dir

class ModuleService:
    def normalize_chapter_name(self, name: str) -> str:
        """
        Converts names like 'Coal and Petroleum Test - 10' or 'chapter-15-coal and petroleum.pdf'
        into a normalized string 'coal and petroleum'.
        """
        name = name.lower()
        name = name.replace(".pdf", "")
        name = re.sub(r"^chapter-\d+-", "", name)
        name = re.sub(r"\s+test\s*[-_]?\s*\d*$", "", name)
        name = name.replace("-", " ")
        name = re.sub(r"[^a-z0-9\s]", "", name)
        name = re.sub(r"\s+", " ", name).strip()
        return name

    def get_pdf_modules(self, subject: str, grade: int | None = None) -> dict[str, dict]:
        """
        Scans the subject directory to find PDFs and extracts module order.
        Returns: { 'normalized_name': {'order': int, 'source_pdf': str} }
        """
        pdf_dir = get_subject_dir(subject, grade)
        modules = {}
        if not pdf_dir.exists():
            return modules

        def sort_key(path: Path) -> int:
            match = re.search(r"^chapter-(\d+)-", path.name.lower())
            return int(match.group(1)) if match else 999

        for file_path in sorted(pdf_dir.glob("*.pdf"), key=sort_key):
            filename = file_path.name
            normalized = self.normalize_chapter_name(filename)
            match = re.search(r"^chapter-(\d+)-", filename.lower())
            order = int(match.group(1)) if match else 999
            modules[normalized] = {
                "order": order,
                "source_pdf": filename,
                "display_name": normalized.title()
            }
        return modules

    def group_quizzes_by_module(self, subject: str, raw_tests: list[dict], grade: int | None = None) -> list[dict]:
        """
        Groups raw mock tests by their normalized module name.
        raw_tests: list of dicts like {'test_name': '...', 'question_count': ...}
        """
        pdf_modules = self.get_pdf_modules(subject, grade)
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
                        "quizzes": []
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
                    "question_count": q["question_count"]
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
                    "question_count": q["question_count"]
                })
            result.append({
                "module_name": "Mixed Practice",
                "module_order": 9999,
                "normalized_name": "mixed practice",
                "source_pdf": None,
                "quizzes": display_mixed
            })

        return result

module_service = ModuleService()
