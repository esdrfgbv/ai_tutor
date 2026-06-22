import sys, asyncio
from pathlib import Path

BACKEND_PATH = Path(r"e:\AI tutor\backend")
sys.path.insert(0, str(BACKEND_PATH))

from app.db.session import SessionLocal
from app.services.question_extraction.question_extraction_pipeline import question_extraction_pipeline
from app.services.knowledge.paddle_ocr_engine import paddle_ocr_engine

# Monkey patch _parse_pdf to only process the first 3 pages
original_parse_pdf = paddle_ocr_engine._parse_pdf
def mock_parse_pdf(file_path):
    import fitz, tempfile
    blocks = []
    doc = fitz.open(str(file_path))
    for page_num in range(min(3, doc.page_count)): # Just first 3 pages
        page = doc[page_num]
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
        img_data = pix.tobytes("png")
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(img_data)
            tmp_path = tmp.name
        try:
            print(f"Parsing page {page_num + 1}...")
            page_blocks = paddle_ocr_engine._parse_page_image(tmp_path, page_num + 1)
            blocks.extend(page_blocks)
        finally:
            Path(tmp_path).unlink(missing_ok=True)
    doc.close()
    
    from app.services.knowledge.paddle_ocr_engine import PaddleParseResult
    blocks = paddle_ocr_engine._classify_and_score(blocks)
    blocks = paddle_ocr_engine._filter_fuse_sort(blocks)
    markdown = paddle_ocr_engine._blocks_to_markdown(blocks)
    return PaddleParseResult(blocks=blocks, total_pages=3, markdown=markdown)

paddle_ocr_engine._parse_pdf = mock_parse_pdf

async def run_fast_test():
    db = SessionLocal()
    try:
        print("Starting fast E2E test (3 pages only)...")
        pdf_path = Path(r"e:\AI tutor\aiseee pyqs\aiseee 2023.pdf")
        
        result = question_extraction_pipeline.process_pdf(
            pdf_path=pdf_path,
            db=db,
            exam_type="AISSEE",
            year=2023,
            grade=6,
            display_name="AISSEE 2023 (Fast Test)"
        )
        
        print("\n=== FAST TEST RESULTS ===")
        print(f"Source ID: {result['source_id']}")
        print(f"Extraction Status: {result['status']}")
        print(f"Questions Found: {result['questions_found']}")
        print(f"Questions Inserted: {result['questions_inserted']}")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_fast_test())
