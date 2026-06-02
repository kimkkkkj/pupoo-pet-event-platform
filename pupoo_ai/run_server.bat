@echo off
REM pupoo_ai 폴더에서 실행해도 상위(popups)를 PYTHONPATH에 넣어 uvicorn 구동
set "ROOT=%~dp0.."
set "PYTHONPATH=%ROOT%"
echo PYTHONPATH=%PYTHONPATH%
call "%~dp0.venv\Scripts\activate.bat"
uvicorn pupoo_ai.app.main:app --reload --port 8000
