# Test all remaining invoices to confirm they work
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
    
    # Get all invoices
    $invoicesResponse = Invoke-RestMethod -Uri "$baseURL/invoices/admin" -Method Get -Headers $headers
    $invoices = $invoicesResponse.invoices
    
    Write-Host "✅ Found $($invoices.Count) invoices - testing each one..." -ForegroundColor Green
    
    foreach ($invoice in $invoices) {
        Write-Host "`n📋 Testing $($invoice.invoiceNo) ($($invoice.customerName)):" -ForegroundColor Cyan
        
        # Test view
        try {
            $viewResponse = Invoke-WebRequest -Uri "$baseURL/invoices/$($invoice._id)/view" -Method Get -Headers $headers
            Write-Host "  ✅ View: Status $($viewResponse.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ View failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Test download
        try {
            $downloadResponse = Invoke-WebRequest -Uri "$baseURL/invoices/$($invoice._id)/download" -Method Get -Headers $headers
            Write-Host "  ✅ Download: Status $($downloadResponse.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ Download failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "`n🎉 All tests completed!" -ForegroundColor Green
    Write-Host "Your Invoice Management should now work perfectly!" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
}
