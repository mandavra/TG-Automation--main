# Test specific invoice view and download
$baseURL = "http://localhost:4000/api"

# Login first
$loginData = @{
    email = "superadmin@tg.local"
    password = "SuperAdmin@12345"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseURL/admin/login" -Method Post -Body $loginData -ContentType "application/json"
$token = $loginResponse.token

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test with invoice that should work (has proper PDF path)
$invoiceId = "68b306426118a759e3306144"
Write-Host "Testing invoice ID: $invoiceId" -ForegroundColor Yellow

# Test view
Write-Host "`nTesting VIEW endpoint..." -ForegroundColor Cyan
try {
    $viewResponse = Invoke-WebRequest -Uri "$baseURL/invoices/$invoiceId/view" -Method Get -Headers $headers
    Write-Host "✅ View endpoint working! Status: $($viewResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ View failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# Test download
Write-Host "`nTesting DOWNLOAD endpoint..." -ForegroundColor Cyan
try {
    $downloadResponse = Invoke-WebRequest -Uri "$baseURL/invoices/$invoiceId/download" -Method Get -Headers $headers
    Write-Host "✅ Download endpoint working! Status: $($downloadResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Download failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
