# Fix the Cloud Test Invoice PDF path
$baseURL = "http://localhost:4000/api"

# Login first
$loginData = @{
    email = "superadmin@tg.local"
    password = "SuperAdmin@12345"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseURL/admin/login" -Method Post -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    
    Write-Host "✅ Authenticated successfully" -ForegroundColor Green
    
    # The Cloud Test Invoice has ID 68b55deddf49617b46fa45bb and invalid path "cloud/test/path/invoice.pdf"
    # Let's try to regenerate or fix it
    $cloudTestInvoiceId = "68b55deddf49617b46fa45bb"
    
    Write-Host "`nTesting regenerate endpoint for Cloud Test Invoice..." -ForegroundColor Cyan
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    try {
        $regenResponse = Invoke-RestMethod -Uri "$baseURL/invoices/$cloudTestInvoiceId/regenerate" -Method Post -Headers $headers
        Write-Host "Regenerate response: $($regenResponse.message)" -ForegroundColor Yellow
    } catch {
        Write-Host "Regenerate failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nNote: The Cloud Test Invoice appears to have an invalid PDF path." -ForegroundColor Yellow
Write-Host "The other invoices should work fine for view/download." -ForegroundColor Yellow
