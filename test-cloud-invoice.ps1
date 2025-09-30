# Test the specific Cloud Test Invoice that's showing in the UI
$baseURL = "http://localhost:4000/api"

# Login first
$loginData = @{
    email = "superadmin@tg.local"
    password = "SuperAdmin@12345"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseURL/admin/login" -Method Post -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    Write-Host "✅ Authenticated successfully" -ForegroundColor Green
    
    # Test the Cloud Test Invoice ID (the one showing in the UI)
    $cloudTestInvoiceId = "68b55deddf49617b46fa45bb"
    Write-Host "`nTesting Cloud Test Invoice ID: $cloudTestInvoiceId" -ForegroundColor Yellow
    
    # Test view endpoint
    Write-Host "`n1. Testing VIEW endpoint..." -ForegroundColor Cyan
    try {
        $viewResponse = Invoke-WebRequest -Uri "$baseURL/invoices/$cloudTestInvoiceId/view" -Method Get -Headers $headers
        Write-Host "✅ View working! Status: $($viewResponse.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ View failed: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorDetails) {
            Write-Host "Error: $($errorDetails.error)" -ForegroundColor Red
        }
    }
    
    # Test download endpoint
    Write-Host "`n2. Testing DOWNLOAD endpoint..." -ForegroundColor Cyan
    try {
        $downloadResponse = Invoke-WebRequest -Uri "$baseURL/invoices/$cloudTestInvoiceId/download" -Method Get -Headers $headers
        Write-Host "✅ Download working! Status: $($downloadResponse.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Download failed: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorDetails) {
            Write-Host "Error: $($errorDetails.error)" -ForegroundColor Red
        }
    }
    
    Write-Host "`n3. Testing with a working invoice for comparison..." -ForegroundColor Cyan
    $workingInvoiceId = "68b306426118a759e3306144"  # This one we know works
    
    try {
        $workingViewResponse = Invoke-WebRequest -Uri "$baseURL/invoices/$workingInvoiceId/view" -Method Get -Headers $headers
        Write-Host "✅ Working invoice view: Status $($workingViewResponse.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Even working invoice failed" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
}
