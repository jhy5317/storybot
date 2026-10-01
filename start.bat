@echo off
cd /d "%~dp0"

rem First run: create backend venv and install packages
if not exist "backend\.venv\Scripts\python.exe" (
    echo [StoryBot] Creating backend virtual environment...
    python -m venv backend\.venv --system-site-packages
    backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
)

rem First run: install frontend packages
if not exist "frontend\node_modules" (
    echo [StoryBot] Installing frontend packages...
    call npm --prefix frontend install
)

echo [StoryBot] Starting backend :8000 and frontend :5173. Close the server windows to stop.
start "StoryBot Backend" cmd /k backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
start "StoryBot Frontend" cmd /k npm --prefix frontend run dev

rem Wait for the model to load, then open the browser
ping -n 9 127.0.0.1 > nul
start "" http://localhost:5173
