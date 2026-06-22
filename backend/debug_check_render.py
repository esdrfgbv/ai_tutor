import fitz
from pathlib import Path

pdf_path = Path('../aiseee pyqs/aiseee 2023.pdf').resolve()
doc = fitz.open(str(pdf_path))
page = doc[0]
rect = page.rect
print(f'Page size: {rect.width}x{rect.height} points')
pix1 = page.get_pixmap(matrix=fitz.Matrix(1, 1))
png1 = pix1.tobytes("png")
print(f'1x render: {pix1.width}x{pix1.height} pixels, {len(png1)/1024:.1f} KB')
pix2 = page.get_pixmap(matrix=fitz.Matrix(2, 2))
png2 = pix2.tobytes("png")
print(f'2x render: {pix2.width}x{pix2.height} pixels, {len(png2)/1024:.1f} KB')
doc.close()
