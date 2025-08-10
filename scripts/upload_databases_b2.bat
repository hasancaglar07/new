@echo off
setlocal ENABLEDELAYEDEXPANSION

rem Proje kok klasore gec
cd /d "%~dp0.."

rem B2 kimlik bilgilerini bu dosyanin icine göm (extern .env gerekmez)
set "B2_APPLICATION_KEY_ID=00472036efb0fa80000000006"
set "B2_APPLICATION_KEY=K004xcKNDiYYGfhtRCIFtcw4f2fnR/0"
set "B2_BUCKET_NAME=yediulya-databases"

rem Varsa calisan python'u kapat (db kilidi olmamasi icin)
taskkill /F /IM python.exe >nul 2>nul

rem Yükleme
python -m scripts.upload_databases_b2
set ERR=%ERRORLEVEL%
if %ERR% NEQ 0 (
  echo [FAIL] Yukleme basarisiz (kod %ERR%).
  pause
  exit /b %ERR%
)

echo [OK] YUKLEME TAMAMLANDI.
pause
endlocal
