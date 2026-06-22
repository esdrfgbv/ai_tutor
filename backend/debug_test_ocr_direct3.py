import logging, fitz, tempfile, json
from pathlib import Path

logging.basicConfig(level=logging.WARNING)
from paddleocr import PaddleOCR

ocr = PaddleOCR(lang='en')

pdf_path = Path('../aiseee pyqs/aiseee 2023.pdf').resolve()
doc = fitz.open(str(pdf_path))
page = doc[0]
pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
doc.close()

with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
    tmp.write(pix.tobytes('png'))
    tmp_path = tmp.name

result = ocr.predict(tmp_path)
page_result = result[0]
print(f'Keys: {list(page_result.keys())}')
print(f'JSON: {page_result.json()[:2000]}')

# Try to get dtc_results and rec_results
dtc = page_result.get('dtc_results', [])
rec = page_result.get('rec_results', [])
boxes = page_result.get('boxes', [])
print(f'dtc_results: {len(dtc) if dtc else 0}')
print(f'rec_results: {len(rec) if rec else 0}')
print(f'boxes: {len(boxes) if boxes else 0}')

# Try printing result as string
full_str = page_result.str()
print(f'Full str (first 2000): {full_str[:2000]}')

Path(tmp_path).unlink(missing_ok=True)
