"""Check extracted text from doc 17, saved to file."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

import fitz
import io
from PIL import Image

fp = r"E:\uploads\knowledge\cc8d6c79d0ac42449a0fde965021d207.pdf"
doc = fitz.open(fp)

lines = []
lines.append(f"Total pages: {doc.page_count}\n")

for i in range(min(5, doc.page_count)):
    page = doc[i]
    native_text = page.get_text("text")
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    ocr_text = pytesseract.image_to_string(img, lang="eng+hin", config="--psm 3")
    lines.append(f"\n{'='*60}\nPAGE {i+1} (native={len(native_text.strip())} chars, ocr={len(ocr_text.strip())} chars)\n{'='*60}\n")
    lines.append(ocr_text[:2000])

doc.close()

# Write to file (bypass terminal encoding issues)
out = os.path.join(os.path.dirname(__file__), "pdf_text_sample.txt")
with open(out, "w", encoding="utf-8") as f:
    f.writelines(lines)
print(f"Written to {out}")

