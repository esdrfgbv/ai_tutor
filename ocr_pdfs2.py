import fitz, os, io
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from paddleocr import PaddleOCR

folder = r'E:\AI tutor\Sainik School\class_6\English\sainik-class-6-english'

ocr = PaddleOCR(lang='en')

# Save first page of each image-based PDF for inspection
files = sorted([f for f in os.listdir(folder) if f.endswith('.pdf') and not f.endswith(' - Copy.pdf') and '(1)' not in f])

for f in files:
    path = os.path.join(folder, f)
    doc = fitz.open(path)
    has_text = any(page.get_text().strip() for page in doc)
    if has_text:
        doc.close()
        continue

    # Process first page
    page = doc[0]
    pix = page.get_pixmap(dpi=300)
    img = Image.open(io.BytesIO(pix.tobytes('png')))
    
    # Enhance contrast but keep RGB
    enhancer = ImageEnhance.Contrast(img)
    img_contrast = enhancer.enhance(1.5)
    enhancer2 = ImageEnhance.Sharpness(img_contrast)
    img_sharp = enhancer2.enhance(2.0)
    
    # Save for inspection
    out_path = os.path.join(folder, f.replace('.pdf', '_page0.png'))
    img_sharp.save(out_path)
    
    # Try OCR on preprocessed image
    img_array = np.array(img_sharp)
    result = ocr.ocr(img_array)
    
    text_lines = []
    if result and result[0]:
        for line in result[0]:
            text_lines.append(line[1][0])
    
    text = ' '.join(text_lines)
    print(f'--- {f} ---')
    if text.strip():
        print(f'  OCR: {text[:200]}')
    else:
        print(f'  OCR: (no text detected)')
    
    doc.close()
