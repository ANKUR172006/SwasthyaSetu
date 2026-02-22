$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"

Push-Location $backend
try {
  docker compose up -d
}
finally {
  Pop-Location
}

Write-Host "Services are running."
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://localhost:8080"
