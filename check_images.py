import fitz, os, io
from PIL import Image

folder = r'E:\AI tutor\Sainik School\class_6\English\sainik-class-6-english'

files = sorted([f for f in os.listdir(folder) if f.endswith('.pdf') and not f.endswith(' - Copy.pdf') and '(1)' not in f])

# Check one image-based PDF to see what's in it
f = '3LyfyrEeSUdAr3DmVGcp.pdf'
path = os.path.join(folder, f)
doc = fitz.open(path)
page = doc[0]

# Get pixmap at high res
pix = page.get_pixmap(dpi=300)
img = Image.open(io.BytesIO(pix.tobytes('png')))
img.save(r'E:\AI tutor\check_page.png')
print(f'Saved check_page.png ({pix.width}x{pix.height})')

# Also try rendering at lower DPI
pix2 = page.get_pixmap(dpi=72)
img2 = Image.open(io.BytesIO(pix2.tobytes('png')))
print(f'Low res: {pix2.width}x{pix2.height}')

# Check if there are any text objects we missed
blocks = page.get_text('dict')['blocks']
print(f'Block types: {set(b["type"] for b in blocks)}')
for b in blocks:
    if b['type'] == 0:  # text
        print(f'Text block: {b}')
    elif b['type'] == 1:  # image
        print(f'Image block: size={b.get("width")}x{b.get("height")}')

doc.close()
