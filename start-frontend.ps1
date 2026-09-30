Write-Host "Starting Hospital OPD Frontend..." -ForegroundColor Cyan
Write-Host "Dashboard: http://localhost:3000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\frontend"
npm run dev
