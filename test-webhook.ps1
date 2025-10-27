# Test Webhook Script for PowerShell

Write-Host "`n=== Testing Zendesk AI Microservice ===" -ForegroundColor Cyan

# 1. Health Check
Write-Host "`n1. Testing Health Endpoint..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
Write-Host "✅ Health Check Response:" -ForegroundColor Green
$health | ConvertTo-Json

# 2. Test Webhook
Write-Host "`n2. Testing Webhook Endpoint..." -ForegroundColor Yellow

# Read the payload file as raw JSON string
$payload = Get-Content -Path "example-webhook-payload.json" -Raw

# Send the request
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/webhook/zendesk" `
                                  -Method Post `
                                  -ContentType "application/json" `
                                  -Body $payload
    
    Write-Host "✅ Webhook Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    
    Write-Host "`n📊 Summary Preview:" -ForegroundColor Cyan
    Write-Host $response.summary.Substring(0, [Math]::Min(200, $response.summary.Length)) -ForegroundColor White
    Write-Host "..." -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n=== Tests Complete ===" -ForegroundColor Cyan
