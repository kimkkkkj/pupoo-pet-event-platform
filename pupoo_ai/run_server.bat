@echo off
chcp 65001 >nul
REM pupoo_ai 폴더에서 실행해도 상위(popups)를 PYTHONPATH에 넣어 uvicorn 구동
set "ROOT=%~dp0.."
set "PYTHONPATH=%ROOT%"
set "PYTHONFAULTHANDLER=1"
echo PYTHONPATH=%PYTHONPATH%
call "%~dp0.venv\Scripts\activate.bat"
if not exist "%~dp0logs" mkdir "%~dp0logs"
cd /d "%~dp0"

REM 서버가 예기치 않게 꺼지면 종료 코드를 logs\ai_server.log에 남기고 5초 뒤 다시 켠다.
REM 로그는 창과 logs\ai_server.log에 함께 남는다(--log-config). 감시 대상은 app 폴더로 좁힌다.
:loop
echo [%date% %time%] AI 서버 시작>> "%~dp0logs\ai_server.log"
uvicorn pupoo_ai.app.main:app --reload --reload-dir "%~dp0app" --port 8000 --log-config "%~dp0logging.json"
echo [%date% %time%] AI 서버 종료 (exit code %errorlevel%)>> "%~dp0logs\ai_server.log"
echo.
echo AI 서버가 종료됐어요 (exit code %errorlevel%). 5초 뒤 다시 켭니다. 끄려면 이 창을 닫으세요.
timeout /t 5 /nobreak >nul
goto loop
