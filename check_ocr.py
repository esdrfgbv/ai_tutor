import importlib
import shutil

for mod_name in ['easyocr', 'paddleocr', 'winrt']:
    try:
        importlib.import_module(mod_name)
        print(f'{mod_name} available')
    except ImportError:
        print(f'{mod_name} not available')

print(f'tesseract: {shutil.which("tesseract")}')
