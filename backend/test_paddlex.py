from pathlib import Path
from paddlex import create_pipeline

pipeline = create_pipeline(pipeline="document_scene_information_extraction_v3")
img_path = Path(r"e:\AI tutor\backend\uploads\pdf_sources\debug\AISSEE_2023_page1.png")
if not img_path.exists():
    import fitz
    doc = fitz.open(r"e:\AI tutor\aiseee pyqs\aiseee 2023.pdf")
    page = doc[0]
    pix = page.get_pixmap()
    pix.save(str(img_path))
    doc.close()

result_list = pipeline.predict(str(img_path))
for page_result in result_list:
    print(type(page_result))
    if isinstance(page_result, dict):
        print("dict keys:", page_result.keys())
        parsing = page_result.get("parsing_res_list", [])
        if parsing:
            print("parsing[0]:", type(parsing[0]), parsing[0])
    else:
        print("obj attributes:", dir(page_result))
        parsing = page_result.get("parsing_res_list", [])
        if parsing:
            print("parsing[0]:", type(parsing[0]), parsing[0])
