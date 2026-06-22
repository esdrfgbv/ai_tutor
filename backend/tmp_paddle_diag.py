from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[0]))

from paddleocr import PPStructureV3
import fitz

pdf = Path('..') / 'aiseee pyqs' / 'aiseee 2023.pdf'
print('pdf exists', pdf.exists())

with fitz.open(str(pdf)) as doc:
    page = doc[0]
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    img_path = Path('page1_test.png')
    pix.save(str(img_path))
    print('saved image', img_path.exists(), img_path)

s = PPStructureV3(lang='en')
print('parser created', type(s))
result = s.predict(str(img_path))
print('result type', type(result), 'len', len(result))
page_result = result[0]
print('page_result type', type(page_result))
try:
    print('page_result keys', list(page_result.keys()))
except Exception as e:
    print('page_result keys error', repr(e))
try:
    prs = page_result.get('parsing_res_list', [])
    print('parsing_res_list type', type(prs), 'len', len(prs))
    if prs:
        first = prs[0]
        print('first item type', type(first))
        if isinstance(first, dict):
            print('first item dict keys', list(first.keys()))
            print('first item label', first.get('label'))
            print('first item content len', len(first.get('content','')))
        else:
            print('first item attrs', [a for a in dir(first) if not a.startswith('_')][:30])
            print('first item label', getattr(first, 'label', None))
            print('first item content len', len(getattr(first, 'content', '') or ''))
except Exception as e:
    print('first item inspect error', repr(e))
