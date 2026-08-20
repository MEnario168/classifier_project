#Requires -Version 5.1
<#
.SYNOPSIS
  Validates that all Smart Sorter lab support files are present.
#>

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $root

$requiredFiles = @(
    "README.md",
    ".gitignore",
    "config.local.env.example",
    "VERIFICATION.md",
    "firebase\firestore.rules",
    "firebase\firestore-schema.md",
    "apps-script\firestore-to-sheets.gs",
    "apps-script\README.md",
    "looker-studio\DASHBOARD-SPEC.md",
    "scripts\test-firestore-post.ps1",
    "scripts\validate-setup.ps1",
    "web\package.json",
    "web\app\page.tsx",
    "web\app\layout.tsx",
    "web\lib\classifier.ts",
    "web\lib\firebase.ts",
    "web\lib\logger.ts",
    "web\lib\user-id.ts",
    "web\.env.local.example",
    "web\README.md",
    "web\public\model\README.md"
)

$passed = 0
$failed = 0

Write-Host "Smart Sorter - Setup Validation"
Write-Host "Project root: $projectRoot"
Write-Host ""

foreach ($relPath in $requiredFiles) {
    $fullPath = Join-Path $projectRoot $relPath
    if (Test-Path $fullPath) {
        Write-Host "[PASS] $relPath" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[FAIL] $relPath - missing" -ForegroundColor Red
        $failed++
    }
}

# Optional: check config.local.env
$envPath = Join-Path $projectRoot "config.local.env"
if (Test-Path $envPath) {
    Write-Host "[INFO] config.local.env exists - Firebase smoke test available" -ForegroundColor Cyan
} else {
    Write-Host "[INFO] config.local.env not found - copy from config.local.env.example to enable smoke test" -ForegroundColor Yellow
}

# Optional: check web env
$webEnvPath = Join-Path $projectRoot "web\.env.local"
if (Test-Path $webEnvPath) {
    Write-Host "[INFO] web/.env.local exists - web app Firebase config ready" -ForegroundColor Cyan
} else {
    Write-Host "[INFO] web/.env.local not found - copy from web/.env.local.example" -ForegroundColor Yellow
}

# Optional: check TM model assets
$modelPath = Join-Path $projectRoot "web\public\model\model.json"
$metadataPath = Join-Path $projectRoot "web\public\model\metadata.json"
if ((Test-Path $modelPath) -and (Test-Path $metadataPath)) {
    Write-Host "[INFO] Teachable Machine TensorFlow.js model found in web/public/model/" -ForegroundColor Cyan
} else {
    Write-Host "[INFO] TM model not yet in web/public/model/ - export TensorFlow.js from Teachable Machine" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Results: $passed passed, $failed failed"

if ($failed -gt 0) {
    exit 1
}

Write-Host "All required files present." -ForegroundColor Green
exit 0
