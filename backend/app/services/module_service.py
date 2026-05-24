import re
from pathlib import Path
from app.services.chapter_service import class_content_root

class ModuleService:
    def normalize_chapter_name(self, name: str) -> str:
        """
        Converts names like 'Coal and Petroleum Test - 10' or 'chapter-15-coal and petroleum.pdf'
        into a normalized string 'coal and petroleum'.
        """
        name = name.lower()
        # Remove extension
        name = name.replace(".pdf", "")
        # Remove 'chapter-XX-' prefix
        name = re.sub(r"^chapter-\d+-", "", name)
        # Remove 'test - XX' suffix
        name = re.sub(r"\s+test\s*[-_]?\s*\d*$", "", name)
        name = re.sub(r"-", " ", name)
        # Strip special characters and extra spaces
        name = re.sub(r"[^a-z0-9\s]", "", name).strip()
        return name

    def get_pdf_modules(self, subject: str) -> dict[str, dict]:
        """
        Scans the subject directory to find PDFs and extracts module order.
        Returns: { 'normalized_name': {'order': int, 'source_pdf': str} }
        """
        # Right now we assume grade 9 based on the class_content_root logic in the app
        folder = subject.lower().strip()
        pdf_dir = class_content_root() / folder
        
        modules = {}
        if not pdf_dir.exists():
            return modules
            
        for file_path in pdf_dir.glob("*.pdf"):
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

    def group_quizzes_by_module(self, subject: str, raw_tests: list[dict]) -> list[dict]:
        """
        Groups raw mock tests by their normalized module name.
        raw_tests: list of dicts like {'test_name': '...', 'question_count': ...}
        """
        pdf_modules = self.get_pdf_modules(subject)
        
        grouped = {}
        # Special group for tests that don't match any chapter cleanly
        mixed_group = []
        
        for test in raw_tests:
            raw_name = test["test_name"]
            normalized = self.normalize_chapter_name(raw_name)
            
            # Find matching module
            match_found = False
            for mod_norm, mod_data in pdf_modules.items():
                if normalized == mod_norm or normalized in mod_norm or mod_norm in normalized:
                    if mod_norm not in grouped:
                        grouped[mod_norm] = {
                            "module_name": mod_data["display_name"],
                            "module_order": mod_data["order"],
                            "normalized_name": mod_norm,
                            "source_pdf": mod_data["source_pdf"],
                            "quizzes": []
                        }
                    grouped[mod_norm]["quizzes"].append(test)
                    match_found = True
                    break
            
            if not match_found:
                # E.g. "Mix Test - 1"
                mixed_group.append(test)
                
        # Sort quizzes within each module and assign display names
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
        
        # Append mixed tests at the end if any
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
