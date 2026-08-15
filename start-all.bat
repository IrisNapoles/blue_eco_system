@echo off
REM Blue Eco Inventory — starts all 3 services at once.
REM Place this file in your BlueEcoProject folder (the parent folder
REM that contains prophet_service, blue_eco_inventory, and blue_eco_frontend).
REM Just double-click it (or run it from a terminal) each time you want
REM to start working.

echo Starting Prophet service...
start "Prophet Service" cmd /k "cd prophet_service && venv\Scripts\activate && uvicorn main:app --port 8001"

timeout /t 2 /nobreak >nul

echo Starting Laravel...
start "Laravel" cmd /k "cd blue_eco_inventory && php artisan serve"

timeout /t 2 /nobreak >nul

echo Starting React...
start "React" cmd /k "cd blue_eco_frontend && npm run dev"

echo.
echo All 3 services starting in separate windows.
echo React app: http://localhost:5173
echo.
pause
