@echo off
echo Backend sunucusu baslatiliyor...
start "Backend Server" cmd /c "uvicorn main:app --host 0.0.0.0 --port 8000"

echo.
echo React Native Metro Bundler (mobil uygulama sunucusu) baslatiliyor...
start "React Native Bundler" cmd /c "cd frontend && npm start"

echo.
echo Android uygulamasi 3 saniye icinde derlenip calistirilacak...
timeout /t 3 /nobreak > nul

echo.
echo Android uygulamasi baslatiliyor...
start "Android App" cmd /c "cd mobile && npm run android"