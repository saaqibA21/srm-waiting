$python = "C:\Users\SAAQIB\AppData\Local\Programs\Python\Python312\python.exe"
Write-Host "Starting Hospital OPD Backend..." -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\backend"
& $python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
