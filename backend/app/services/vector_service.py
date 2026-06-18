from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import get_settings

app_settings = get_settings()

_chroma_path = Path(app_settings.chroma_path)
_chroma_path.mkdir(parents=True, exist_ok=True)

_client = chromadb.PersistentClient(
    path=str(_chroma_path),
    settings=ChromaSettings(anonymized_telemetry=False),
)

COLLECTION_NAME = "jnv_sainik_embeddings"


def _get_collection():
    try:
        return _client.get_collection(COLLECTION_NAME)
    except Exception:
        return _client.create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )


class VectorService:
    def add_chunks(
        self,
        vector_ids: list[str],
        texts: list[str],
        metadatas: list[dict],
    ) -> None:
        if not texts:
            return
        collection = _get_collection()
        collection.add(
            ids=vector_ids,
            documents=texts,
            metadatas=metadatas,
        )

    def query(
        self,
        query_text: str,
        n_results: int = 5,
        filters: dict | None = None,
    ) -> list[dict]:
        collection = _get_collection()
        where = None
        if filters:
            where = {k: v for k, v in filters.items() if v is not None}
        results = collection.query(
            query_texts=[query_text],
            n_results=n_results,
            where=where,
        )
        output = []
        if results["ids"] and results["ids"][0]:
            for i in range(len(results["ids"][0])):
                output.append(
                    {
                        "id": results["ids"][0][i],
                        "text": results["documents"][0][i] if results["documents"] else "",
                        "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                        "distance": results["distances"][0][i] if results["distances"] else 0,
                    }
                )
        return output

    def get_collection_stats(self) -> dict:
        collection = _get_collection()
        count = collection.count()
        return {"collection": COLLECTION_NAME, "total_chunks": count}

    def delete_collection(self) -> None:
        try:
            _client.delete_collection(COLLECTION_NAME)
        except Exception:
            pass

    def delete_by_source(self, pdf_id: int) -> None:
        collection = _get_collection()
        results = collection.get(where={"pdf_id": pdf_id})
        if results["ids"]:
            collection.delete(ids=results["ids"])


vector_service = VectorService()
