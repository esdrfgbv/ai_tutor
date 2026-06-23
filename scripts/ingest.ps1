$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."
$env:DATABASE_URL = "postgresql+psycopg2://postgres:password@localhost:5432/postgres"
$env:CHROMA_PATH = ".\vector_db\chroma"
$env:UPLOAD_DIR = ".\uploads"
$env:SOURCE_ROOT = "."
python .\ingestion\ingest.py --source-root .
