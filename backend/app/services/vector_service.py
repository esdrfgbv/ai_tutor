"""
Vector Service
===============
Single source of truth for all ChromaDB operations.

Unifies the legacy (jnv_sainik_embeddings) and KB (knowledge_base)
collections under one API so that pipeline_orchestrator, retrieval_service,
rag_service, and knowledge_base routes all go through the same wrapper.

Includes lazy initialisation, error handling, and a default fallback collection
for callers that don't care about the split.
"""

from __future__ import annotations

import logging
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ── Legacy collection (existing quiz/mock-test embeddings) ──
LEGACY_COLLECTION = "jnv_sainik_embeddings"
# ── KB collection (new knowledge-base pipeline) ──
KB_COLLECTION = "knowledge_base"

_client: chromadb.PersistentClient | None = None


def _ensure_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        settings = get_settings()
        path = Path(settings.chroma_path)
        path.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=str(path),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _client


def _get_collection(name: str = KB_COLLECTION):
    client = _ensure_client()
    try:
        return client.get_collection(name)
    except Exception:
        return client.create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"},
        )


class VectorService:
    """Unified vector-store interface backed by ChromaDB."""

    KB_COLLECTION = KB_COLLECTION
    LEGACY_COLLECTION = LEGACY_COLLECTION

    # ── Write ──────────────────────────────────────────────────────────────

    def add_chunks(
        self,
        vector_ids: list[str],
        texts: list[str],
        metadatas: list[dict],
        *,
        collection: str = KB_COLLECTION,
        batch_size: int = 100,
    ) -> None:
        if not texts:
            return
        coll = _get_collection(collection)
        for i in range(0, len(texts), batch_size):
            batch_ids = vector_ids[i : i + batch_size]
            batch_texts = texts[i : i + batch_size]
            batch_meta = metadatas[i : i + batch_size]
            try:
                coll.add(
                    ids=batch_ids,
                    documents=batch_texts,
                    metadatas=batch_meta,
                )
                logger.debug("Added %d vectors to %s", len(batch_ids), collection)
            except Exception:
                logger.exception("Batch add failed for %s at offset %d", collection, i)

    def delete_vectors(
        self,
        *,
        ids: list[str] | None = None,
        where: dict | None = None,
        collection: str = KB_COLLECTION,
    ) -> None:
        coll = _get_collection(collection)
        try:
            if ids:
                coll.delete(ids=ids)
            elif where:
                where_filter = where
                if len(where_filter) > 1:
                    where_filter = {"$and": [{k: v} for k, v in where_filter.items()]}
                existing = coll.get(where=where_filter)
                if existing["ids"]:
                    coll.delete(ids=existing["ids"])
        except Exception:
            logger.exception("Delete from %s failed", collection)

    # ── Read ───────────────────────────────────────────────────────────────

    def query(
        self,
        query_text: str,
        n_results: int = 5,
        filters: dict | None = None,
        *,
        collection: str = KB_COLLECTION,
    ) -> list[dict]:
        coll = _get_collection(collection)
        where = None
        if filters:
            where = {k: v for k, v in filters.items() if v is not None}
            if len(where) > 1:
                where = {"$and": [{k: v} for k, v in where.items()]}
        try:
            results = coll.query(
                query_texts=[query_text],
                n_results=n_results,
                where=where,
            )
        except Exception:
            logger.exception("Vector query failed on %s", collection)
            return []

        output = []
        if results["ids"] and results["ids"][0]:
            for i in range(len(results["ids"][0])):
                output.append({
                    "id": results["ids"][0][i],
                    "text": results["documents"][0][i] if results["documents"] else "",
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0,
                })
        return output

    # ── Admin ──────────────────────────────────────────────────────────────

    def get_collection_stats(self, collection: str = KB_COLLECTION) -> dict:
        try:
            coll = _get_collection(collection)
            count = coll.count()
            return {"collection": collection, "total_vectors": count, "status": "healthy"}
        except Exception:
            logger.exception("Failed to get stats for %s", collection)
            return {"collection": collection, "total_vectors": 0, "status": "unavailable"}

    def delete_collection(self, collection: str = KB_COLLECTION) -> None:
        try:
            _ensure_client().delete_collection(collection)
        except Exception:
            logger.exception("Failed to delete collection %s", collection)

    def list_collections(self) -> list[str]:
        try:
            return _ensure_client().list_collections()
        except Exception:
            logger.exception("Failed to list collections")
            return []

    def count(self, collection: str = KB_COLLECTION) -> int:
        try:
            return _get_collection(collection).count()
        except Exception:
            return 0


vector_service = VectorService()
