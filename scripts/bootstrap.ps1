$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path ".env")) {
  Copy-Item "config\.env.example" ".env"
  Write-Host "Created .env from config/.env.example"
}

if (-not (Test-Path "config\providers.yaml")) {
  Copy-Item "config\providers.example.yaml" "config\providers.yaml"
  Write-Host "Created config/providers.yaml — fill in API keys"
}

New-Item -ItemType Directory -Force -Path "data\notes","data\uploads","data\cache" | Out-Null
docker compose --env-file .env -f deploy/docker-compose.yml up -d --build
$port = "8080"
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*APP_PORT\s*=\s*(.+)$') { $port = $Matches[1].Trim() }
}
Write-Host "Vid2Know is starting. Open http://localhost:$port"
