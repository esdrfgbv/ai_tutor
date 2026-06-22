from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

from app.services.question_extraction.question_parser import ParsedQuestion

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    is_valid: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def add_error(self, msg: str) -> None:
        self.errors.append(msg)
        self.is_valid = False

    def add_warning(self, msg: str) -> None:
        self.warnings.append(msg)


_CORRUPTION_PATTERNS: list[re.Pattern] = [
    re.compile(r"^0\s*\?\)\s*c\s*[^\w]*$"),
    re.compile(r"fcT&|vtf|<#\s*tefa|ctf|xtf"),
    re.compile(r"^[@#$%^&*+=]{3,}$"),
    re.compile(r"^\d*\s*[?]\s*\)\s*[a-zA-Z]"),
]

_GARBAGE_WORDS: set[str] = {"fcT&", "vtf", "tefa", "ctf", "xtf", "£7J", "#<"}

_MIN_QUESTION_TEXT_LENGTH = 5
_MIN_OPTION_COUNT = 2
_MAX_OPTION_COUNT = 6
_MIN_PRINTABLE_RATIO = 0.90
_MAX_SYMBOL_RATIO = 0.50


class QuestionValidator:
    """
    Validates extracted questions against corruption and quality rules.

    Rejects:
      - OCR garbage (e.g., "0 ?) c £7J", "Q.9 fcT& vtf <# tefa fcT&")
      - Questions with insufficient text (< 20 chars)
      - Questions with fewer than 2 options
      - Questions with low printable character ratio (< 0.90)
      - Questions containing known garbage tokens
    """

    def validate(self, question: ParsedQuestion) -> ValidationResult:
        result = ValidationResult(is_valid=True)

        self._check_corruption(question, result)
        self._check_text_length(question, result)
        self._check_options(question, result)
        self._check_printable_ratio(question, result)
        self._check_question_number(question, result)
        self._check_option_consistency(question, result)

        return result

    def _check_corruption(self, question: ParsedQuestion, result: ValidationResult) -> None:
        text = question.question_text
        raw = question.raw_block

        if not text and not raw:
            result.add_error("Empty question text")
            return

        for pat in _CORRUPTION_PATTERNS:
            if pat.search(text) or pat.search(raw):
                result.add_error(f"Corruption pattern detected: {pat.pattern[:40]}")
                return

        combined = f"{text} {' '.join(o for o in [question.option_a, question.option_b, question.option_c, question.option_d] if o)}"

        for word in _GARBAGE_WORDS:
            if word in combined:
                result.add_error(f"Garbage token found: '{word}'")
                return

    def _check_text_length(self, question: ParsedQuestion, result: ValidationResult) -> None:
        text = question.question_text.strip()
        if len(text) < _MIN_QUESTION_TEXT_LENGTH:
            result.add_error(
                f"Question text too short ({len(text)} chars, minimum {_MIN_QUESTION_TEXT_LENGTH})"
            )

    def _check_options(self, question: ParsedQuestion, result: ValidationResult) -> None:
        count = question.option_count()
        if count < _MIN_OPTION_COUNT:
            result.add_error(
                f"Insufficient options ({count}, minimum {_MIN_OPTION_COUNT})"
            )
        elif count > _MAX_OPTION_COUNT:
            result.add_warning(
                f"Unusual option count ({count}, maximum expected {_MAX_OPTION_COUNT})"
            )

        for label in ["A", "B", "C", "D", "E"]:
            text = getattr(question, f"option_{label.lower()}")
            if text:
                if len(text.strip()) < 1:
                    result.add_warning(f"Option {label} is empty")
                for word in _GARBAGE_WORDS:
                    if word in text:
                        result.add_error(f"Garbage token found in option {label}: '{word}'")

    def _check_printable_ratio(self, question: ParsedQuestion, result: ValidationResult) -> None:
        combined = question.question_text + " " + " ".join(
            getattr(question, f"option_{l}") for l in ["a", "b", "c", "d", "e"]
            if getattr(question, f"option_{l}")
        )

        if not combined:
            result.add_error("No printable content")
            return

        printable = sum(1 for c in combined if c.isprintable() and not c.isspace())
        total = sum(1 for c in combined if not c.isspace())
        ratio = printable / max(total, 1)

        if ratio < _MIN_PRINTABLE_RATIO:
            result.add_error(
                f"Low printable character ratio ({ratio:.2f}, minimum {_MIN_PRINTABLE_RATIO})"
            )

        symbol_count = sum(
            1 for c in combined
            if not c.isalnum() and not c.isspace() and c not in ".,;:!?()[]{}+-=*/$%^'\"<>_"
        )
        symbol_ratio = symbol_count / max(total, 1)
        if symbol_ratio > _MAX_SYMBOL_RATIO:
            result.add_error(f"Excessive suspicious symbols detected ({symbol_ratio:.2f})")

    def _check_question_number(self, question: ParsedQuestion, result: ValidationResult) -> None:
        if question.question_number is not None:
            if question.question_number < 1 or question.question_number > 300:
                result.add_warning(
                    f"Unusual question number: {question.question_number}"
                )

    def _check_option_consistency(self, question: ParsedQuestion, result: ValidationResult) -> None:
        options_texts = []
        for label in ["A", "B", "C", "D"]:
            text = getattr(question, f"option_{label.lower()}")
            if text:
                options_texts.append(text)

        if len(options_texts) < 2:
            return

        lengths = [len(t) for t in options_texts]
        if max(lengths) > 10 * min(lengths) and min(lengths) > 0:
            result.add_warning(
                f"Option length inconsistency: lengths={lengths}"
            )


question_validator = QuestionValidator()
