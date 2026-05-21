import json
from abc import ABC, abstractmethod
from typing import Any

from app.core.config import get_settings


class AIProvider(ABC):
    @abstractmethod
    def generate_json(self, system: str, prompt: str) -> dict[str, Any]:
        raise NotImplementedError


class OpenAIProvider(AIProvider):
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required when AI_PROVIDER=openai")
        from openai import OpenAI

        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    def generate_json(self, system: str, prompt: str) -> dict[str, Any]:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)


class GeminiProvider(AIProvider):
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is required when AI_PROVIDER=gemini")
        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel(settings.gemini_model)

    def generate_json(self, system: str, prompt: str) -> dict[str, Any]:
        response = self.model.generate_content(
            f"{system}\nReturn strictly valid JSON.\n\n{prompt}",
            generation_config={"response_mime_type": "application/json"},
        )
        return json.loads(response.text)


def get_ai_provider() -> AIProvider:
    provider = get_settings().ai_provider.lower()
    if provider == "gemini":
        return GeminiProvider()
    return OpenAIProvider()


def concept_based_question(context: str, topic: str, index: int) -> dict[str, Any]:
    sentences = [part.strip() for part in context.replace("\n", " ").split(".") if len(part.strip()) > 50]
    if sentences:
        basis = sentences[index % len(sentences)]
        return {
            "question_type": "reasoning" if index % 3 == 2 else "mcq",
            "prompt": f"Which reasoning step best matches this {topic} idea: {basis[:160]}?",
            "options": ["Identify the given values first", "Ignore the conditions", "Choose the longest option", "Skip the verification step"],
            "correct_answer": "Identify the given values first",
            "textbook_explanation": basis,
            "ai_explanation": "Strong exam answers begin by identifying the given information, then choosing the rule that connects it to what is asked.",
            "difficulty": ["easy", "medium", "hard"][index % 3],
            "topic": topic,
        }
    templates = [
        {
            "prompt": f"In a {topic} question, what should you do before solving?",
            "options": ["Read the question and list given values", "Guess the closest option", "Start from the final answer", "Ignore units"],
            "correct_answer": "Read the question and list given values",
            "textbook_explanation": "Every NCERT-style solution starts by understanding what is given and what is asked.",
            "ai_explanation": "This prevents calculation mistakes and helps you choose the correct rule.",
        },
        {
            "prompt": f"Which habit is most useful for PYQ-style {topic} practice?",
            "options": ["Compare options after solving", "Memorize option positions", "Avoid revising mistakes", "Solve without reading fully"],
            "correct_answer": "Compare options after solving",
            "textbook_explanation": "Previous-year questions often test small differences in logic, values, or wording.",
            "ai_explanation": "Solving first and then comparing options improves accuracy under time pressure.",
        },
        {
            "prompt": f"If two answers look possible in a {topic} MCQ, what is the best next step?",
            "options": ["Check the condition in the question", "Pick the shorter answer", "Change the question", "Leave it immediately"],
            "correct_answer": "Check the condition in the question",
            "textbook_explanation": "Conditions such as class, unit, diagram label, or keyword decide the correct answer.",
            "ai_explanation": "Most close-option mistakes happen when one condition is missed.",
        },
    ]
    item = templates[index % len(templates)]
    return {
        "question_type": "reasoning" if index % 3 == 2 else "mcq",
        "difficulty": ["easy", "medium", "hard"][index % 3],
        "topic": topic,
        **item,
    }
