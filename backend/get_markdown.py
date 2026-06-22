import sys
from pathlib import Path
BACKEND_PATH = Path(r"e:\AI tutor\backend")
sys.path.insert(0, str(BACKEND_PATH))
from app.services.knowledge.paddle_ocr_engine import paddle_ocr_engine

# Monkey patch _parse_pdf to only process the first 2 pages
original_parse_pdf = paddle_ocr_engine._parse_pdf
def mock_parse_pdf(file_path):
    import fitz, tempfile
    blocks = []
    errors = []
    doc = fitz.open(str(file_path))
    for page_num in range(2): # Just first 2 pages
        page = doc[page_num]
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
        img_data = pix.tobytes("png")
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(img_data)
            tmp_path = tmp.name
        try:
            print(f"Testing structure parsing for page {page_num + 1}")
            result_list = paddle_ocr_engine._structure.predict(tmp_path)
            for page_result in result_list:
                print("page_result type:", type(page_result))
                if isinstance(page_result, dict):
                    print("page_result keys:", page_result.keys())
                    parsing = page_result.get("parsing_res_list", [])
                else:
                    print("page_result attributes:", dir(page_result))
                    parsing = getattr(page_result, "parsing_res_list", [])
                
                print(f"Got {len(parsing)} parsed blocks")
                for i, block in enumerate(parsing[:5]):
                    print(f"Block {i}:")
                    if isinstance(block, dict):
                        print("  keys:", block.keys())
                        print("  label:", block.get("label"))
                        print("  text:", repr(block.get("text", "")[:100]))
                        print("  content:", repr(block.get("content", "")[:100]))
                    else:
                        print("  type:", type(block))
                        print("  label:", getattr(block, "label", None))
                        print("  text:", repr(getattr(block, "text", "")[:100]))
                        print("  content:", repr(getattr(block, "content", "")[:100]))
                        
                # Also try document generation
                try:
                    import markdown
                    if hasattr(page_result, 'html'):
                        print("Has HTML attribute")
                except Exception as e:
                    pass
                    
            page_blocks = paddle_ocr_engine._parse_with_structure(tmp_path, page_num + 1)
            blocks.extend(page_blocks)
        finally:
            Path(tmp_path).unlink(missing_ok=True)
    doc.close()
    blocks = paddle_ocr_engine._classify_and_score(blocks)
    blocks = paddle_ocr_engine._filter_fuse_sort(blocks)
    markdown = paddle_ocr_engine._blocks_to_markdown(blocks)
    print("--- FINAL MARKDOWN OUTPUT ---")
    print(markdown[:1000])

paddle_ocr_engine._parse_pdf = mock_parse_pdf
paddle_ocr_engine.parse_document(Path(r"e:\AI tutor\aiseee pyqs\aiseee 2023.pdf"))
