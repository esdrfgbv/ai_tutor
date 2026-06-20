"""
Retrieval Service
===================
Production hybrid retrieval with real BM25 (rank_bm25), vector search,
query expansion, cross-encoder reranking, and metadata-aware filtering.

Pipeline:
  Query -> Query Expansion -> Hybrid Retrieval (Vector + BM25)
  -> Metadata Filter -> Cross-Encoder Reranking -> Context Assembly
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import ClassVar

from rank_bm25 import BM25Okapi
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.knowledge_models import KnowledgeChunk, KnowledgeDocument
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)

_STOPWORDS: set[str] = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "can",
    "could", "shall", "should", "may", "might", "must", "to", "of", "in",
    "for", "on", "with", "at", "by", "from", "as", "into", "through",
    "during", "before", "after", "above", "below", "between", "out",
    "off", "over", "under", "again", "further", "then", "once", "here",
    "there", "when", "where", "why", "how", "all", "each", "every",
    "both", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "just",
    "because", "but", "and", "or", "if", "while", "what", "which", "who",
    "whom", "this", "that", "these", "those", "it", "its", "please",
}

_SYNONYM_MAP: dict[str, list[str]] = {
    "math": ["mathematics", "maths", "arithmetic", "algebra", "geometry"],
    "science": ["physics", "chemistry", "biology", "natural science"],
    "solve": ["calculate", "find", "determine", "evaluate", "compute"],
    "explain": ["describe", "elaborate", "clarify", "define", "illustrate"],
    "difference": ["distinguish", "differentiate", "compare", "contrast"],
    "example": ["instance", "sample", "illustration", "case"],
    "formula": ["equation", "expression", "rule", "theorem", "law"],
    "diagram": ["figure", "graph", "chart", "illustration", "plot"],
    "prove": ["show", "demonstrate", "verify", "establish", "justify"],
    "define": ["define", "mean", "represent", "constitute", "signify"],
    "method": ["technique", "approach", "procedure", "way", "process"],
    "property": ["characteristic", "attribute", "feature", "quality", "trait"],
    "function": ["operation", "procedure", "process", "relation", "mapping"],
    "energy": ["power", "force", "work", "potential", "kinetic"],
    "number": ["digit", "numeral", "integer", "value", "quantity"],
    "angle": ["degree", "radian", "inclination", "slope", "gradient"],
    "triangle": ["polygon", "trigonometry", "triangular", "right angle"],
    "equation": ["expression", "formula", "relation", "identity", "function"],
    "ratio": ["proportion", "fraction", "rate", "percentage", "scale"],
    "area": ["surface", "region", "space", "zone", "extent"],
    "volume": ["capacity", "mass", "density", "size", "measure"],
    "velocity": ["speed", "rate", "acceleration", "momentum", "motion"],
    "current": ["electricity", "flow", "charge", "circuit", "ampere"],
    "cell": ["organelle", "tissue", "organism", "biology", "membrane"],
    "force": ["push", "pull", "gravity", "friction", "pressure"],
    "acid": ["base", "ph", "chemical", "reaction", "compound"],
    "climate": ["weather", "temperature", "environment", "atmosphere", "season"],
}


@dataclass
class RetrievalResult:
    """A single retrieval result with source attribution."""
    chunk_id: int
    document_id: int
    text: str
    chunk_type: str
    page_number: int | None
    score: float
    document_name: str
    subject: str | None = None
    chapter: str | None = None
    source_type: str | None = None
    image_context: dict | None = None


@dataclass
class RetrievalResponse:
    """Complete retrieval response."""
    results: list[RetrievalResult]
    context_text: str
    sources: list[str]
    total_results: int


class RetrievalService:
    """
    Hybrid retrieval: vector + real BM25 + cross-encoder reranking.
    """

    _cross_encoder = None
    _cross_encoder_loaded: bool = False

    def retrieve(
        self,
        db: Session,
        query: str,
        *,
        n_results: int = 10,
        doc_class: str | None = None,
        subject: str | None = None,
        chapter: str | None = None,
        exam_type: str | None = None,
        year: int | None = None,
        source_type: str | None = None,
        enable_expansion: bool = True,
        enable_rerank: bool = True,
    ) -> RetrievalResponse:
        """
        Main retrieval entry point.
        Steps: query expansion -> vector search -> BM25 search
               -> fusion -> cross-encoder reranking -> enrich -> context assembly
        """
        # Step 0: Query expansion
        expanded = self._expand_query(query) if enable_expansion else [query]

        # Step 1: Vector search
        vector_results = self._vector_search(
            expanded, n_results=n_results * 2,
            doc_class=doc_class, subject=subject, chapter=chapter,
            exam_type=exam_type, year=year,
        )

        # Step 2: Real BM25 search using rank_bm25
        bm25_results = self._bm25_search(
            db, query, expanded, n_results=n_results * 2,
            doc_class=doc_class, subject=subject, chapter=chapter,
            source_type=source_type,
        )

        # Step 3: Fusion via Reciprocal Rank Fusion
        merged = self._reciprocal_rank_fusion(vector_results, bm25_results)
        top_k = merged[:n_results * 3]

        # Step 4: Cross-encoder reranking
        if enable_rerank and len(top_k) > 1:
            reranked = self._rerank(query, top_k)
        else:
            reranked = top_k

        # Step 5: Enrich with document metadata
        enriched = self._enrich_results(db, reranked[:n_results])

        # Step 6: Assemble context
        context_text, sources = self._assemble_context(enriched)

        return RetrievalResponse(
            results=enriched,
            context_text=context_text,
            sources=sources,
            total_results=len(enriched),
        )

    # ── Query Expansion ────────────────────────────────────────────────────

    def _expand_query(self, query: str) -> list[str]:
        """
        Generate multiple query variants for better recall.
        Returns the original query plus expanded variants.
        """
        variants = [query]
        tokens = self._tokenize(query)

        # Variant 1: Add synonyms for key terms
        expanded_tokens = list(tokens)
        for token in tokens:
            if token in _SYNONYM_MAP:
                expanded_tokens.extend(
                    s for s in _SYNONYM_MAP[token] if s not in expanded_tokens
                )
        if expanded_tokens != tokens:
            variants.append(" ".join(expanded_tokens))

        # Variant 2: Remove stopwords (focus on key terms)
        key_terms = [t for t in tokens if t not in _STOPWORDS]
        if len(key_terms) >= 2 and key_terms != tokens:
            variants.append(" ".join(key_terms))

        logger.debug("Query expanded: %s -> %s", query, variants)
        return variants

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        """Lowercase and split into tokens."""
        text = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
        return [t for t in text.split() if len(t) >= 2]

    # ── Vector Search ──────────────────────────────────────────────────────

    def _vector_search(
        self,
        queries: list[str],
        n_results: int = 20,
        **filters,
    ) -> list[dict]:
        """Multi-query vector search via vector_service."""
        chroma_filters = {}
        for key, value in filters.items():
            if value is not None:
                chroma_key = "class" if key == "doc_class" else key
                chroma_filters[chroma_key] = value

        seen_keys: set[str] = set()
        results: list[dict] = []

        for query in queries:
            if not query.strip():
                continue
            try:
                hits = vector_service.query(
                    query, n_results=n_results,
                    filters=chroma_filters if chroma_filters else None,
                )
            except Exception as e:
                logger.warning("Vector search error for '%s': %s", query[:50], e)
                continue

            for r in hits:
                meta = r.get("metadata", {})
                key = f"vec-{meta.get('chunk_id', r['id'])}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    results.append({
                        "id": r["id"],
                        "text": r.get("text", ""),
                        "metadata": meta,
                        "raw_score": 1 - r.get("distance", 0),
                        "source": "vector",
                    })

        results.sort(key=lambda x: x["raw_score"], reverse=True)
        return results[:n_results]

    # ── Real BM25 Search ───────────────────────────────────────────────────

    def _bm25_search(
        self,
        db: Session,
        original_query: str,
        expanded_queries: list[str],
        n_results: int = 20,
        **filters,
    ) -> list[dict]:
        """
        Real BM25 search using rank_bm25.
        Loads chunks matching metadata filters, builds BM25 index, scores.
        """
        q = db.query(KnowledgeChunk).join(KnowledgeDocument)
        q = q.filter(KnowledgeDocument.is_deleted == False)  # noqa: E712

        if filters.get("doc_class"):
            q = q.filter(KnowledgeChunk.doc_class == filters["doc_class"])
        if filters.get("subject"):
            q = q.filter(KnowledgeChunk.doc_subject == filters["subject"])
        if filters.get("chapter"):
            q = q.filter(KnowledgeChunk.doc_chapter == filters["chapter"])
        if filters.get("source_type"):
            q = q.filter(KnowledgeChunk.source_type == filters["source_type"])

        chunks: list[KnowledgeChunk] = q.limit(500).all()
        if not chunks:
            return []

        tokenized_corpus = [
            self._tokenize(c.chunk_text) for c in chunks
        ]
        bm25 = BM25Okapi(tokenized_corpus)

        # Score against all query variants
        all_scores: dict[int, float] = {}
        for qtext in expanded_queries:
            tokens = self._tokenize(qtext)
            if not tokens:
                continue
            doc_scores = bm25.get_scores(tokens)
            for i, s in enumerate(doc_scores):
                if s > 0:
                    chunk_id = chunks[i].id
                    all_scores[chunk_id] = max(all_scores.get(chunk_id, 0), s)

        ranked = sorted(all_scores.items(), key=lambda x: x[1], reverse=True)

        output = []
        for chunk_id, score in ranked[:n_results]:
            chunk = next((c for c in chunks if c.id == chunk_id), None)
            if not chunk:
                continue
            output.append({
                "id": f"bm25-{chunk.id}",
                "text": chunk.chunk_text,
                "metadata": {
                    "chunk_id": chunk.id,
                    "document_id": chunk.document_id,
                    "chunk_type": (
                        chunk.chunk_type.value
                        if hasattr(chunk.chunk_type, 'value')
                        else str(chunk.chunk_type)
                    ),
                    "page_number": chunk.page_number or 0,
                    "subject": chunk.doc_subject,
                    "chapter": chunk.doc_chapter,
                    "source_type": (
                        chunk.source_type.value
                        if hasattr(chunk.source_type, 'value')
                        else str(chunk.source_type)
                    ) if chunk.source_type else None,
                },
                "raw_score": float(score) / 100.0,
                "source": "bm25",
            })

        return output

    # ── Reciprocal Rank Fusion ─────────────────────────────────────────────

    def _reciprocal_rank_fusion(
        self,
        vector_results: list[dict],
        bm25_results: list[dict],
        k: int = 60,
    ) -> list[dict]:
        scores: dict[str, float] = {}
        items: dict[str, dict] = {}

        for rank, result in enumerate(vector_results):
            key = self._result_key(result)
            rrf = 1.0 / (k + rank + 1)
            scores[key] = scores.get(key, 0) + rrf
            if key not in items:
                items[key] = result

        for rank, result in enumerate(bm25_results):
            key = self._result_key(result)
            rrf = 1.0 / (k + rank + 1)
            scores[key] = scores.get(key, 0) + rrf
            if key not in items:
                items[key] = result

        sorted_keys = sorted(scores, key=lambda x: scores[x], reverse=True)
        merged = []
        for key in sorted_keys:
            item = items[key]
            item["rrf_score"] = scores[key]
            merged.append(item)
        return merged

    def _result_key(self, result: dict) -> str:
        meta = result.get("metadata", {})
        chunk_id = meta.get("chunk_id")
        if chunk_id:
            return f"chunk-{chunk_id}"
        return result.get("id", str(hash(result.get("text", "")[:100])))

    # ── Cross-Encoder Reranking ────────────────────────────────────────────

    def _rerank(self, query: str, results: list[dict]) -> list[dict]:
        """Rerank using cross-encoder with fallback to bi-encoder."""
        texts = [
            (r.get("text") or "")[:512] for r in results
        ]
        if not texts:
            return results

        scores: list[float] | None = None

        # Attempt 1: Cross-encoder
        scores = self._cross_encoder_score(query, texts)

        # Attempt 2: Fallback to bi-encoder cosine similarity
        if scores is None:
            scores = self._bi_encoder_fallback(query, texts)

        if scores is None:
            return results

        for r, s in zip(results, scores):
            r["rerank_score"] = s

        ranked = sorted(
            zip(results, scores),
            key=lambda x: x[1], reverse=True,
        )
        return [r for r, _ in ranked]

    def _cross_encoder_score(
        self, query: str, texts: list[str],
    ) -> list[float] | None:
        """Score using cross-encoder model. Returns None if unavailable."""
        if not RetrievalService._cross_encoder_loaded:
            try:
                from sentence_transformers import CrossEncoder
                RetrievalService._cross_encoder = CrossEncoder(
                    "cross-encoder/ms-marco-MiniLM-L-6-v2",
                    trust_remote_code=True,
                )
                RetrievalService._cross_encoder_loaded = True
                logger.info("Cross-encoder loaded.")
            except Exception as e:
                logger.warning("Cross-encoder load failed: %s", e)
                RetrievalService._cross_encoder_loaded = True
                return None

        if RetrievalService._cross_encoder is None:
            return None

        try:
            pairs = [[query, t] for t in texts]
            return RetrievalService._cross_encoder.predict(pairs).tolist()
        except Exception as e:
            logger.warning("Cross-encoder scoring failed: %s", e)
            return None

    def _bi_encoder_fallback(
        self, query: str, texts: list[str],
    ) -> list[float] | None:
        """Fallback: compute cosine similarity via sentence-transformers."""
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer("all-MiniLM-L6-v2")
            query_emb = model.encode(query, normalize_embeddings=True)
            text_embs = model.encode(texts, normalize_embeddings=True)
            import numpy as np
            scores = (text_embs @ query_emb).tolist()
            return scores
        except Exception as e:
            logger.warning("Bi-encoder fallback failed: %s", e)
            return None

    # ── Enrichment & Context Assembly ──────────────────────────────────────

    def _enrich_results(
        self, db: Session, results: list[dict]
    ) -> list[RetrievalResult]:
        enriched = []
        for result in results:
            meta = result.get("metadata", {})
            doc_id = meta.get("document_id")
            chunk_id = meta.get("chunk_id")

            doc_name = ""
            subject = meta.get("subject")
            chapter = meta.get("chapter")
            source_type_val = meta.get("source_type")

            if doc_id:
                doc = db.get(KnowledgeDocument, doc_id)
                if doc:
                    doc_name = doc.original_file_name
                    subject = subject or doc.doc_subject
                    chapter = chapter or doc.doc_chapter
                    source_type_val = source_type_val or (
                        doc.source_type.value if doc.source_type else None
                    )

            image_context = None
            if chunk_id:
                chunk = db.get(KnowledgeChunk, chunk_id)
                if chunk and chunk.structured_data and chunk.chunk_type.value == "image_context":
                    image_context = chunk.structured_data

            score = result.get(
                "rerank_score",
                result.get("rrf_score", result.get("raw_score", 0)),
            )

            enriched.append(RetrievalResult(
                chunk_id=chunk_id or 0,
                document_id=doc_id or 0,
                text=result.get("text", ""),
                chunk_type=meta.get("chunk_type", "text"),
                page_number=meta.get("page_number"),
                score=score,
                document_name=doc_name,
                subject=subject,
                chapter=chapter,
                source_type=source_type_val,
                image_context=image_context,
            ))

        return enriched

    def _assemble_context(
        self, results: list[RetrievalResult]
    ) -> tuple[str, list[str]]:
        context_parts = []
        sources = []
        seen_sources: set[str] = set()

        for r in results:
            text = r.text[:500]
            source_label = ""
            if r.subject and r.chapter:
                source_label = f"{r.subject}/{r.chapter}"
            elif r.document_name:
                source_label = r.document_name

            if r.image_context:
                text += f"\n[Image: {r.image_context.get('description', '')}]"

            context_parts.append(f"- {text}")

            if source_label and source_label not in seen_sources:
                seen_sources.add(source_label)
                sources.append(source_label)

        context = "\n".join(context_parts)
        return context, sources


retrieval_service = RetrievalService()
