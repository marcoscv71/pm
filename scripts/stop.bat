@echo off
docker compose -f "%~dp0..\compose.yaml" down
if errorlevel 1 exit /b %errorlevel%
