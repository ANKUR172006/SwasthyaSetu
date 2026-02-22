$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Write-Host "[1/6] Checking Docker..."
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  throw "Docker is not installed or not in PATH."
}

Write-Host "[2/6] Ensuring env files..."
$backendEnv = Join-Path $backend ".env"
$frontendEnv = Join-Path $frontend ".env"
if (-not (Test-Path $backendEnv)) {
  Copy-Item (Join-Path $backend ".env.example") $backendEnv -Force
}
if (-not (Test-Path $frontendEnv)) {
  Copy-Item (Join-Path $frontend ".env.example") $frontendEnv -Force
}

Push-Location $backend
try {
  Write-Host "[3/6] Building and starting services..."
  docker compose up -d --build

  Write-Host "[4/6] Running database migration..."
  docker compose exec -T backend npx prisma db push

  Write-Host "[5/6] Seeding pilot data..."
  docker compose exec -T backend npm run prisma:seed
}
finally {
  Pop-Location
}

Write-Host "[6/6] Done."
Write-Host "Frontend:  http://localhost:5173"
Write-Host "Backend:   http://localhost:8080"
Write-Host "AI:        http://localhost:8000/health"
Write-Host "Postgres:  localhost:5432"
Write-Host "Redis:     localhost:6379"
