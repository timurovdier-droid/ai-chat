# Создание репозитория ai-chat на GitHub и первый push
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-Host "Установите GitHub CLI: winget install GitHub.cli"
  exit 1
}

gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Войдите в GitHub: gh auth login"
  gh auth login -h github.com -p https -w
}

gh repo create ai-chat --public --source=. --remote=origin --push
if ($LASTEXITCODE -ne 0) {
  Write-Host "Если репозиторий уже есть: git remote add origin https://github.com/<user>/ai-chat.git"
  exit $LASTEXITCODE
}

Write-Host "Репозиторий создан. Дальше: npm run vercel:deploy (после vercel login)"
