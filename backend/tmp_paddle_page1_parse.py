from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[0]))
from app.services.knowledge.paddle_ocr_engine import paddle_ocr_engine

image_path = Path('page1_test.png')
print('image exists', image_path.exists())
if not image_path.exists():
    raise SystemExit('missing image')

blocks = paddle_ocr_engine._parse_page_image(str(image_path), page_number=1)
print('blocks count', len(blocks))
for i, b in enumerate(blocks[:10], 1):
    print(f'block {i}: type={b.content_type}, num_words={len(b.text.split())}, page={b.page_number}, label_content={b.text[:80]!r}')
    if b.bbox:
        print('  bbox', b.bbox)
    if b.content_type == b.content_type.TABLE:
        print('  table rows', len(b.table_rows or []), 'cols', b.table_columns)
