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
print(f'Type: {type(result)}')

if isinstance(result, list):
    print(f'List length: {len(result)}')
    for i, item in enumerate(result[:3]):
        print(f'  [{i}] type={type(item).__name__}, value={str(item)[:300]}')
elif isinstance(result, dict):
    for k, v in result.items():
        print(f'  key={k}, type={type(v).__name__}')
        if isinstance(v, list) and len(v) > 0:
            print(f'    list len={len(v)}, first={str(v[0])[:300]}')

Path(tmp_path).unlink(missing_ok=True)
