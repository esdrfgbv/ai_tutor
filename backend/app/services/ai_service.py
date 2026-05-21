from abc import ABC, abstractmethod

from app.core.config import get_settings


class AIProvider(ABC):
    @abstractmethod
    def generate_text(self, prompt: str) -> str:
        raise NotImplementedError


# =========================================
# GROQ
# =========================================

class GroqProvider(AIProvider):
    def __init__(self):
        settings = get_settings()

        from openai import OpenAI

        self.client = OpenAI(
            api_key=settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1",
        )

        self.model = (
            settings.groq_model
            or "llama-3.1-8b-instant"
        )

    def generate_text(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            max_tokens=100,
            temperature=0.2,
        )

        content = response.choices[0].message.content

        if not content:
            return "No answer generated."

        return content.strip()


# =========================================
# MAIN PROVIDER
# =========================================

def get_ai_provider() -> AIProvider:
    settings = get_settings()

    provider = (
        settings.ai_provider
        or "groq"
    ).lower()

    print(f"Using AI Provider: {provider}")

    return GroqProvider()