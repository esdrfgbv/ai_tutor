from abc import ABC, abstractmethod

from app.core.config import get_settings


class AIProvider(ABC):
    @abstractmethod
    def generate_text(self, prompt: str) -> str:
        raise NotImplementedError


# =========================================
# OLLAMA (LOCAL AI)
# =========================================

class OllamaProvider(AIProvider):
    def __init__(self):
        from openai import OpenAI

        self.client = OpenAI(
            base_url="http://localhost:11434/v1",
            api_key="ollama",
        )

        # Change if needed:
        # qwen3
        # gemma3
        # llama3
        self.model = "llama3.1:8b"

    def generate_text(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            max_tokens=200,
            temperature=0.2,
        )

        return response.choices[0].message.content.strip()


# =========================================
# OPENAI
# =========================================

class OpenAIProvider(AIProvider):
    def __init__(self):
        settings = get_settings()

        from openai import OpenAI

        self.client = OpenAI(
            api_key=settings.openai_api_key
        )

        self.model = (
            settings.openai_model
            or "gpt-4o-mini"
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
            max_tokens=200,
            temperature=0.2,
        )

        return response.choices[0].message.content.strip()


# =========================================
# GEMINI
# =========================================

class GeminiProvider(AIProvider):
    def __init__(self):
        settings = get_settings()

        import google.generativeai as genai

        genai.configure(
            api_key=settings.gemini_api_key
        )

        self.model = genai.GenerativeModel(
            settings.gemini_model
            or "gemini-1.5-flash"
        )

    def generate_text(self, prompt: str) -> str:
        response = self.model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": 200,
                "temperature": 0.2,
            },
        )

        return response.text.strip()


# =========================================
# OPENROUTER
# =========================================

class OpenRouterProvider(AIProvider):
    def __init__(self):
        settings = get_settings()

        from openai import OpenAI

        self.client = OpenAI(
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
        )

        self.model = (
            settings.openrouter_model
            or "openai/gpt-4o-mini"
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
            max_tokens=200,
            temperature=0.2,
        )

        return response.choices[0].message.content.strip()


# =========================================
# MAIN PROVIDER
# =========================================

def get_ai_provider() -> AIProvider:
    settings = get_settings()

    provider = (
        settings.ai_provider
        or "ollama"
    ).lower()

    print(f"Using AI Provider: {provider}")

    if provider == "gemini":
        return GeminiProvider()

    if provider == "openrouter":
        return OpenRouterProvider()

    if provider == "openai":
        return OpenAIProvider()

    return OllamaProvider()