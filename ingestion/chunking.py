import re


def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"Downloaded from.*?(?=\.|$)", "", text, flags=re.IGNORECASE)
    return text.strip()


def chunk_text(text: str, chunk_size: int = 950, overlap: int = 140) -> list[str]:
    words = clean_text(text).split()
    if not words:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = max(0, end - overlap)
    return chunks
