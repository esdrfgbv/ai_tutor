$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."
$env:DATABASE_URL = "mysql+pymysql://prep_user:prep_password@127.0.0.1:3307/jnv_sainik_prep"
$env:CHROMA_PATH = ".\vector_db\chroma"
$env:UPLOAD_DIR = ".\uploads"
$env:SOURCE_ROOT = "."
python .\ingestion\ingest.py --source-root .
