# Подключение проекта к Vercel (после push на GitHub)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

npm exec vercel login
npm exec vercel link --yes
Write-Host @"

В панели Vercel (Project Settings -> Environment Variables) добавьте:
  GEMINI_API_KEY
  GEMINI_MODEL (опционально, по умолчанию gemini-3.5-flash-lite)

Затем: npm run vercel:deploy
Или подключите GitHub-репозиторий ai-chat в vercel.com -> Import Project для автодеплоя.
"@
