@echo off
title VetCare Pro 2.0
cd /d "%~dp0"
echo ================================================
echo    VetCare Pro 2.0 - Iniciando servidor local
echo ================================================
echo.

where node >nul 2>nul
if %errorlevel%==0 (
  node server.js 8080
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo Iniciando con Python...
  start "VetCarePro server" /min cmd /c "py -m http.server 8080"
  timeout /t 2 >nul
  start "" http://localhost:8080
  echo.
  echo Servidor corriendo en http://localhost:8080
  echo Cerra la ventana minimizada "VetCarePro server" para detenerlo.
  pause
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  echo Iniciando con Python...
  start "VetCarePro server" /min cmd /c "python -m http.server 8080"
  timeout /t 2 >nul
  start "" http://localhost:8080
  echo.
  echo Servidor corriendo en http://localhost:8080
  echo Cerra la ventana minimizada "VetCarePro server" para detenerlo.
  pause
  goto :eof
)

echo.
echo   No se encontro Node.js ni Python en esta PC.
echo.
echo   Instala Node.js (recomendado) desde https://nodejs.org
echo   y volve a ejecutar este archivo.
echo.
pause
