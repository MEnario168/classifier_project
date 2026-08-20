#Requires -Version 5.1
<#
.SYNOPSIS
  Deploy the web app to Vercel production, including local model files in public/model/.

.USAGE
  1. Export TensorFlow.js from Teachable Machine
  2. Copy model.json, metadata.json, weights into web/public/model/
  3. Run: .\scripts\deploy-web.ps1
#>

$ErrorActionPreference = "Stop"
$webRoot = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\web"
$modelDir = Join-Path $webRoot "public\model"

$required = @("model.json", "metadata.json")
$missing = @()
foreach ($file in $required) {
    if (-not (Test-Path (Join-Path $modelDir $file))) {
        $missing += $file
    }
}

$weightFiles = Get-ChildItem -Path $modelDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in ".bin", ".json" -and $_.Name -notin @("README.md") }

if ($missing.Count -gt 0) {
    Write-Error @"
Missing model files in web/public/model/:
  $($missing -join ', ')

Steps:
  1. Open Teachable Machine -> Export Model -> TensorFlow.js -> Download
  2. Copy model.json, metadata.json, and weights.bin (or shard files) to:
     $modelDir
  3. Re-run this script
"@
}

$hasWeights = $weightFiles | Where-Object { $_.Name -match 'weights|shard' }
if (-not $hasWeights) {
    Write-Warning "No weights.bin or shard files found in public/model/. Deploy may fail at runtime."
}

Write-Host "Model files found:"
Get-ChildItem $modelDir -File | ForEach-Object { Write-Host "  $($_.Name) ($([math]::Round($_.Length/1KB, 1)) KB)" }

Write-Host "`nDeploying to Vercel (smart-sorter project)..."
Push-Location $webRoot
try {
    # Ensure we deploy to smart-sorter (not a wrongly linked "web" project)
    npx vercel link --project smart-sorter --scope menario168s-projects --yes | Out-Null
    npx vercel project update smart-sorter --auto-detect root-directory --scope menario168s-projects --non-interactive | Out-Null
    npx vercel deploy --prod --scope menario168s-projects
} finally {
    Pop-Location
}

Write-Host "`nAfter deploy, verify:"
Write-Host "  https://smart-sorter-rust.vercel.app/model/metadata.json"
Write-Host "  https://smart-sorter-rust.vercel.app"
