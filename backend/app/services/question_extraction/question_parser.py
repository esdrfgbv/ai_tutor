from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class ParsedQuestion:
    question_number: int | None = None
    question_text: str = ""
    option_a: str = ""
    option_b: str = ""
    option_c: str = ""
    option_d: str = ""
    option_e: str = ""
    correct_answer: str | None = None
    marks: str | None = None
    section: str | None = None
    page_number: int | None = None
    raw_block: str = ""
    has_diagram: bool = False
    has_table: bool = False
    has_formula: bool = False
    solution_text: str | None = None
    metadata: dict = field(default_factory=dict)

    def option_count(self) -> int:
        return sum(1 for o in [self.option_a, self.option_b, self.option_c, self.option_d, self.option_e] if o)

    def options_list(self) -> list[dict]:
        result = []
        for label in ["A", "B", "C", "D", "E"]:
            text = getattr(self, f"option_{label.lower()}")
            if text:
                is_correct = (self.correct_answer and self.correct_answer.upper() == label)
                result.append({"label": label, "text": text, "is_correct": is_correct})
        return result


QUESTION_START_PATTERNS = [
    re.compile(r"^\s*(\d{1,3})\s*[.)]\s*", re.MULTILINE),
    re.compile(r"^\s*(?:Q|प्र)\.?\s*(\d{1,3})\s*[.)]?\s*", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^\s*(?:Question|प्रश्न)\s*(\d{1,3})\s*[.:)\s]\s*", re.MULTILINE | re.IGNORECASE),
]

OPTION_MARKER_PATTERNS = [
    re.compile(r"(?<!\w)\(\s*([a-e1-5])\s*\)", re.IGNORECASE),
    re.compile(r"(?m)^\s*([A-Ea-e1-5])\s*[.)]\s+"),
]

ANSWER_PATTERNS = [
    re.compile(r"\*\*Answer:\s*([A-Ea-e1-5])\s*\*\*", re.IGNORECASE),
    re.compile(r"(?:Ans(?:wer)?\.?\s*[:\-]?\s*)([A-Ea-e1-5])", re.IGNORECASE),
    re.compile(r"Correct\s+(?:Option|Answer|Ans)?\s*[:\-]?\s*\(?([A-Ea-e1-5])\)?", re.IGNORECASE),
]

_DIGIT_TO_LETTER = {"1": "A", "2": "B", "3": "C", "4": "D", "5": "E"}

MARKS_PATTERN = re.compile(r"\[(\d+)\s*[Mm]arks?\]", re.IGNORECASE)
SOLUTION_TAG_RE = re.compile(r"^\*\*Solution\*\*:\s*(.*)", re.IGNORECASE | re.DOTALL)
PAGE_MARKER_RE = re.compile(r"<!--\s*page:(\d+)\s*-->")
ANSWER_SECTION_RE = re.compile(
    r"(?im)^\s*(?:#{1,6}\s*)?(?:answer\s+key|answers?|solutions?|explanations?)\b"
)
HTML_TABLE_RE = re.compile(r"<table\b.*?</table>", re.IGNORECASE | re.DOTALL)
HTML_IMAGE_RE = re.compile(r"<img\b[^>]*\bsrc=[\"']([^\"']+)[\"'][^>]*>", re.IGNORECASE)
MD_IMAGE_RE = re.compile(r"!\[[^\]]*\]\(([^)]+)\)")
FORMULA_RE = re.compile(r"\$\$?.+?\$\$?", re.DOTALL)


class QuestionParser:
    """
    Parses PaddleOCR structured markdown into normalized question records.

    The parser is marker-based, not chunk-based: question numbers define record
    boundaries, option markers define option fields, and visual/table/formula
    markup remains attached to the owning question.
    """

    def parse_markdown(self, markdown: str, page_boundaries: list[tuple[int, int, int]] | None = None) -> list[ParsedQuestion]:
        if not markdown or not markdown.strip():
            return []

        markdown = self._truncate_answer_section(markdown)
        sections = self._split_sections(markdown)
        all_questions: list[ParsedQuestion] = []

        for section_name, section_text in sections:
            questions = self._extract_questions_from_text(section_text, section_name)
            all_questions.extend(questions)

        return all_questions

    def _truncate_answer_section(self, markdown: str) -> str:
        match = ANSWER_SECTION_RE.search(markdown)
        return markdown[:match.start()] if match else markdown

    def _split_sections(self, markdown: str) -> list[tuple[str | None, str]]:
        sections: list[tuple[str | None, str]] = []
        current_section: str | None = None
        current_lines: list[str] = []
        current_page = 1

        for line in markdown.split("\n"):
            page_match = re.match(r"---\s*Page\s+(\d+)\s*---", line)
            if page_match:
                current_page = int(page_match.group(1))
                current_lines.append(f"<!-- page:{current_page} -->")
                continue

            section_match = re.match(r"^#{2,6}\s+(.+)$", line)
            if section_match:
                if current_lines:
                    sections.append((current_section, "\n".join(current_lines)))
                    current_lines = []
                current_section = section_match.group(1).strip()
                current_lines.append(f"<!-- page:{current_page} -->")
                continue

            current_lines.append(line)

        if current_lines:
            sections.append((current_section, "\n".join(current_lines)))

        return sections

    def _extract_questions_from_text(self, text: str, section_name: str | None) -> list[ParsedQuestion]:
        questions: list[ParsedQuestion] = []
        solution_match = SOLUTION_TAG_RE.search(text)
        solution_text = solution_match.group(1).strip() if solution_match else None
        question_starts = self._find_question_starts(text)

        for i, (qnum, start_pos) in enumerate(question_starts):
            end_pos = question_starts[i + 1][1] if i + 1 < len(question_starts) else len(text)
            raw_block = text[start_pos:end_pos].strip()
            if len(raw_block) < 5:
                continue

            q = ParsedQuestion(
                question_number=qnum,
                section=section_name,
                raw_block=raw_block,
                solution_text=solution_text,
                page_number=self._extract_page_number(raw_block),
            )

            self._extract_options(q, raw_block)
            self._extract_answer(q, raw_block)
            self._extract_marks(q, raw_block)
            self._detect_features(q, raw_block)

            if q.option_count() >= 2:
                questions.append(q)

        return questions

    def _find_question_starts(self, text: str) -> list[tuple[int, int]]:
        matches: list[tuple[int, int]] = []
        for pat in QUESTION_START_PATTERNS:
            for m in pat.finditer(text):
                qnum = int(m.group(1))
                if 1 <= qnum <= 300:
                    matches.append((qnum, m.start()))

        matches.sort(key=lambda item: item[1])
        unique: list[tuple[int, int]] = []
        seen_positions: set[int] = set()
        for qnum, pos in matches:
            if pos not in seen_positions:
                seen_positions.add(pos)
                unique.append((qnum, pos))
        return unique

    def _extract_options(self, q: ParsedQuestion, raw_block: str) -> None:
        options_found = self._split_options(raw_block)
        if len(options_found) < 2:
            return

        for label, text in options_found:
            setattr(q, f"option_{label.lower()}", text)

        q.question_text = self._clean_question_text(self._question_text_before_options(raw_block))

    def _split_options(self, raw_block: str) -> list[tuple[str, str]]:
        markers = self._choose_option_markers(raw_block)
        if len(markers) < 2:
            return []

        options_found: list[tuple[str, str]] = []
        seen_labels: set[str] = set()
        for idx, marker in enumerate(markers):
            raw_label = marker.group(1).upper()
            label = _DIGIT_TO_LETTER.get(raw_label, raw_label)
            if label in seen_labels:
                continue
            end = markers[idx + 1].start() if idx + 1 < len(markers) else len(raw_block)
            text = self._clean_option_text(raw_block[marker.end():end])
            if text:
                seen_labels.add(label)
                options_found.append((label, text))
        return options_found

    def _choose_option_markers(self, raw_block: str) -> list[re.Match]:
        candidate_groups: list[list[re.Match]] = []
        for pat in OPTION_MARKER_PATTERNS:
            matches = [m for m in pat.finditer(raw_block) if m.group(1).upper() in "ABCDE12345"]
            if matches:
                candidate_groups.append(matches)

        if not candidate_groups:
            return []

        parenthesized = candidate_groups[0]
        lowercase_parenthesized = [
            m for m in parenthesized
            if raw_block[m.start():m.end()].lower() == raw_block[m.start():m.end()]
        ]
        if len(lowercase_parenthesized) >= 2:
            return lowercase_parenthesized

        return max(candidate_groups, key=len)

    def _question_text_before_options(self, raw_block: str) -> str:
        markers = self._choose_option_markers(raw_block)
        text = raw_block[:markers[0].start()] if markers else raw_block
        return re.sub(r"^\s*(?:Q\.\s*)?\d{1,3}\s*[.)]?\s*", "", text).strip()

    def _clean_question_text(self, text: str) -> str:
        text = PAGE_MARKER_RE.sub("", text)
        text = HTML_TABLE_RE.sub("", text)
        text = HTML_IMAGE_RE.sub("", text)
        text = MD_IMAGE_RE.sub("", text)
        return re.sub(r"\s+", " ", text).strip()

    def _clean_option_text(self, text: str) -> str:
        if "\n\n" in text and not re.search(r"<table\b|\$\$?|!\[|<img\b", text, re.IGNORECASE):
            text = text.split("\n\n", 1)[0]
        text = PAGE_MARKER_RE.sub("", text)
        text = HTML_TABLE_RE.sub("", text)
        text = HTML_IMAGE_RE.sub("", text)
        text = MD_IMAGE_RE.sub("", text)
        text = re.split(r"(?im)^\s*(?:answer|solution|explanation)\b", text)[0]
        return re.sub(r"\s+", " ", text).strip()

    def _extract_answer(self, q: ParsedQuestion, raw_block: str) -> None:
        for pat in ANSWER_PATTERNS:
            m = pat.search(raw_block)
            if m:
                raw_ans = m.group(1).upper()
                q.correct_answer = _DIGIT_TO_LETTER.get(raw_ans, raw_ans)
                return

    def _extract_marks(self, q: ParsedQuestion, raw_block: str) -> None:
        m = MARKS_PATTERN.search(raw_block)
        if m:
            q.marks = m.group(1)

    def _detect_features(self, q: ParsedQuestion, raw_block: str) -> None:
        tables = HTML_TABLE_RE.findall(raw_block)
        images = HTML_IMAGE_RE.findall(raw_block) + MD_IMAGE_RE.findall(raw_block)
        formulas = FORMULA_RE.findall(raw_block)

        q.metadata["tables"] = tables
        q.metadata["images"] = images
        q.metadata["formulas"] = formulas
        q.has_table = bool(tables) or bool(re.search(r"\|.+\|\n\|[-| ]+\|\n", raw_block))
        q.has_diagram = bool(images) or bool(re.search(r"_\[(Diagram|Figure|Image).*?\]_", raw_block, re.IGNORECASE))
        q.has_formula = bool(formulas)

    def _extract_page_number(self, raw_block: str) -> int | None:
        matches = PAGE_MARKER_RE.findall(raw_block)
        return int(matches[-1]) if matches else None


question_parser = QuestionParser()
