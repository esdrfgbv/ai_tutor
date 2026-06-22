import fitz, os, io
from PIL import Image

folder = r'E:\AI tutor\Sainik School\class_6\English\sainik-class-6-english'

# Try PaddleOCR first, fallback to easyocr
try:
    from paddleocr import PaddleOCR
    ocr = PaddleOCR(lang='en')
    ocr_type = 'paddleocr'
except Exception as e:
    print(f'PaddleOCR failed: {e}')
    try:
        import easyocr
        ocr = easyocr.Reader(['en'], gpu=False)
        ocr_type = 'easyocr'
    except Exception as e2:
        print(f'easyocr failed: {e2}')
        ocr_type = None

files = sorted([f for f in os.listdir(folder) if f.endswith('.pdf') and not f.endswith(' - Copy.pdf') and '(1)' not in f])

for f in files:
    path = os.path.join(folder, f)
    doc = fitz.open(path)
    has_text = any(page.get_text().strip() for page in doc)
    if has_text:
        doc.close()
        continue

    print(f'--- OCR: {f} ---')
    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes('png')))
        
        if ocr_type == 'paddleocr':
            import numpy as np
            result = ocr.ocr(np.array(img))
            text_lines = []
            if result and result[0]:
                for line in result[0]:
                    text_lines.append(line[1][0])
            text = ' '.join(text_lines)
        elif ocr_type == 'easyocr':
            result = ocr.readtext(img)
            text = ' '.join([item[1] for item in result])
        else:
            text = ''
        
        # Print first non-empty significant line
        lines = [t.strip() for t in text.split('\n') if t.strip() and len(t.strip()) > 3]
        for l in lines[:5]:
            print(f'  {l[:100]}')
        if lines:
            break  # Just need first page
    
    doc.close()
