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
    "assets\.gitkeep",
    "firebase\firestore.rules",
    "firebase\firestore-schema.md",
    "kodular\KODULAR-BLOCKS.md",
    "kodular\sample-labels.txt",
    "kodular\sample-firestore-payload.json",
    "apps-script\firestore-to-sheets.gs",
    "apps-script\README.md",
    "looker-studio\DASHBOARD-SPEC.md",
    "scripts\test-firestore-post.ps1",
    "scripts\validate-setup.ps1"
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

# Optional: check TM model assets
$modelPath = Join-Path $projectRoot "assets\model.tflite"
$labelsPath = Join-Path $projectRoot "assets\labels.txt"
if ((Test-Path $modelPath) -and (Test-Path $labelsPath)) {
    Write-Host "[INFO] Teachable Machine assets found in assets/" -ForegroundColor Cyan
} else {
    Write-Host "[INFO] TM model not yet in assets/ - export from Teachable Machine when ready" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Results: $passed passed, $failed failed"

if ($failed -gt 0) {
    exit 1
}

Write-Host "All required files present." -ForegroundColor Green
exit 0
