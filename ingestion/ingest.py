import argparse
import sys
from pathlib import Path

BACKEND_PATH = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_PATH) not in sys.path:
    sys.path.insert(0, str(BACKEND_PATH))

from app.db.session import Base, SessionLocal, engine
from app.models.models import EmbeddingMetadata, PdfMetadata
from app.services.vector_service import vector_service
from ingestion.chunking import chunk_text
from ingestion.metadata import infer_metadata
from ingestion.pdf_parser import extract_pages


def discover_pdfs(source_root: Path) -> list[Path]:
    ignored_parts = {"frontend", "backend", "node_modules", ".git", "vector_db", ".venv"}
    return sorted(
        path
        for path in source_root.rglob("*.pdf")
        if not any(part in ignored_parts for part in path.parts)
    )


def ingest_pdf(path: Path, source_root: Path) -> int:
    db = SessionLocal()
    try:
        metadata = infer_metadata(path, source_root)
        existing = db.query(PdfMetadata).filter(PdfMetadata.file_path == str(path)).first()
        pages = extract_pages(path)
        if existing:
            return 0
        pdf = PdfMetadata(**metadata, total_pages=len(pages))
        db.add(pdf)
        db.flush()
        vector_ids: list[str] = []
        texts: list[str] = []
        vector_metadatas: list[dict] = []
        chunk_rows: list[EmbeddingMetadata] = []
        chunk_index = 0
        for page in pages:
            for chunk in chunk_text(page["text"]):
                vector_id = f"pdf-{pdf.id}-p{page['page_number']}-c{chunk_index}"
                vector_meta = {
                    "pdf_id": pdf.id,
                    "file_name": pdf.file_name,
                    "grade": pdf.grade,
                    "subject": pdf.subject,
                    "chapter": pdf.chapter,
                    "topic": pdf.topic,
                    "source_type": pdf.source_type.value,
                    "year": pdf.year,
                    "difficulty": pdf.difficulty.value,
                    "page_number": page["page_number"],
                }
                vector_ids.append(vector_id)
                texts.append(chunk)
                vector_metadatas.append({key: value for key, value in vector_meta.items() if value is not None})
                chunk_rows.append(EmbeddingMetadata(vector_id=vector_id, text_preview=chunk[:1000], **vector_meta))
                chunk_index += 1
        if texts:
            vector_service.add_chunks(vector_ids, texts, vector_metadatas)
            db.add_all(chunk_rows)
        db.commit()
        return len(texts)
    finally:
        db.close()


def run(source_root: Path) -> None:
    Base.metadata.create_all(bind=engine)
    pdfs = discover_pdfs(source_root)
    total_chunks = 0
    for pdf in pdfs:
        chunks = ingest_pdf(pdf.resolve(), source_root.resolve())
        total_chunks += chunks
        print(f"{pdf}: {chunks} chunks")
    print(f"Indexed {len(pdfs)} PDFs and {total_chunks} chunks")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest textbook and PYQ PDFs into MySQL metadata and Chroma vectors.")
    parser.add_argument("--source-root", default=".", help="Root directory containing PDF folders")
    args = parser.parse_args()
    run(Path(args.source_root))
