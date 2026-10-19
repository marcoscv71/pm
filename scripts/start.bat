@echo off
docker compose -f "%~dp0..\compose.yaml" up --build -d
if errorlevel 1 exit /b %errorlevel%
