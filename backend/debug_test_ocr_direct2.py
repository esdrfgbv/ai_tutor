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
print(f'Type: {type(result)}, len: {len(result)}')

page_result = result[0]
print(f'Page result type: {type(page_result)}')
print(f'Page result dir: {[a for a in dir(page_result) if not a.startswith("_")]}')

# Check for various possible attributes
for attr in ['boxes', 'text', 'res', 'result', 'dtc_results', 'rec_results', 'rec_res', 'dt_result', 'ocr_result']:
    if hasattr(page_result, attr):
        val = getattr(page_result, attr)
        print(f'  {attr}: type={type(val).__name__}')
        if isinstance(val, list):
            print(f'    len={len(val)}')
            if len(val) > 0:
                print(f'    first={str(val[0])[:300]}')

Path(tmp_path).unlink(missing_ok=True)
