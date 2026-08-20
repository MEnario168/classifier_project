#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke test: POST a sample document to Firestore via REST API.

.USAGE
  1. Copy config.local.env.example to config.local.env and fill in values
  2. Run: .\scripts\test-firestore-post.ps1
#>

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $root "config.local.env"

if (-not (Test-Path $envFile)) {
    Write-Error "Missing config.local.env — copy from config.local.env.example and fill in Firebase credentials."
}

$config = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+?)=(.+)$') {
        $config[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}

$projectId = $config["FIREBASE_PROJECT_ID"]
$apiKey = $config["FIREBASE_WEB_API_KEY"]

if (-not $projectId -or $projectId -eq "your-project-id") {
    Write-Error "Set FIREBASE_PROJECT_ID in config.local.env"
}
if (-not $apiKey -or $apiKey -eq "your-web-api-key") {
    Write-Error "Set FIREBASE_WEB_API_KEY in config.local.env"
}

$url = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents/smart_sorter_logs?key=$apiKey"

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$body = @{
    fields = @{
        classification = @{ stringValue = "Plastic" }
        confidence     = @{ doubleValue = 0.98 }
        timestamp      = @{ timestampValue = $timestamp }
        user_id        = @{ stringValue = "smoke-test-$(Get-Random -Maximum 9999)" }
    }
} | ConvertTo-Json -Depth 5

Write-Host "POST $url"
Write-Host "Body: $body"

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
    Write-Host "`nSuccess! Document created:"
    Write-Host ($response | ConvertTo-Json -Depth 5)
} catch {
    Write-Error "POST failed: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}

# Optional: list documents
Write-Host "`nListing documents..."
$listUrl = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents/smart_sorter_logs?key=$apiKey"
try {
    $list = Invoke-RestMethod -Uri $listUrl -Method Get
    $count = if ($list.documents) { $list.documents.Count } else { 0 }
    Write-Host "Found $count document(s) in smart_sorter_logs"
} catch {
    Write-Warning "List failed: $($_.Exception.Message)"
}
