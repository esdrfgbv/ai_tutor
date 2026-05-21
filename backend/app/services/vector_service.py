from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.core.logging import logger


class VectorService:
    def __init__(self) -> None:
        settings = get_settings()
        Path(settings.chroma_path).mkdir(parents=True, exist_ok=True)
        self._client = None
        self._collection = None

        # Load model globally during startup to prevent downloading/loading on every request
        logger.info(f"Loading embedding model: {settings.embedding_model}")
        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer(settings.embedding_model)
        logger.info("Embedding model loaded and ready.")

    @property
    def collection(self):
        if self._collection is None:
            import chromadb

            self._client = chromadb.PersistentClient(path=str(get_settings().chroma_path))
            self._collection = self._client.get_or_create_collection(
                "learning_chunks", metadata={"hnsw:space": "cosine"}
            )
        return self._collection

    # Removed lazy model property, model is now loaded on init

    @staticmethod
    def build_where(filters: dict[str, Any] | None) -> dict[str, Any] | None:
        if not filters:
            return None
        conditions = [{key: value} for key, value in filters.items() if value is not None]
        if not conditions:
            return None
        if len(conditions) == 1:
            return conditions[0]
        return {"$and": conditions}

    def add_chunks(self, ids: list[str], texts: list[str], metadatas: list[dict[str, Any]]) -> None:
        embeddings = self.model.encode(texts, normalize_embeddings=True, show_progress_bar=False).tolist()
        self.collection.upsert(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    def search(self, query: str, filters: dict[str, Any] | None = None, limit: int = 8) -> list[dict[str, Any]]:
        try:
            embedding = self.model.encode([query], normalize_embeddings=True, show_progress_bar=False).tolist()[0]
            where = self.build_where(filters)
            result = self.collection.query(
                query_embeddings=[embedding],
                n_results=limit,
                where=where,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:
            logger.warning("Vector search failed: %s", exc)
            return []

        rows: list[dict[str, Any]] = []
        for idx, document in enumerate(result.get("documents", [[]])[0]):
            distance = result.get("distances", [[]])[0][idx]
            metadata = result.get("metadatas", [[]])[0][idx] or {}
            rows.append(
                {
                    "text": document,
                    "metadata": metadata,
                    "score": round(max(0.0, min(1.0, 1 - float(distance))), 4),
                }
            )
        return rows


vector_service = VectorService()
