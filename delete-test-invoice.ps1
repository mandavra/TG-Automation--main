# Delete the problematic Cloud Test Invoice
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
    
    # The problematic Cloud Test Invoice ID
    $cloudTestInvoiceId = "68b55deddf49617b46fa45bb"
    
    Write-Host "`nAttempting to delete Cloud Test Invoice..." -ForegroundColor Yellow
    Write-Host "Invoice ID: $cloudTestInvoiceId" -ForegroundColor Yellow
    Write-Host "This invoice has an invalid PDF path and is causing view/download errors." -ForegroundColor Yellow
    
    # Note: We need to create a delete endpoint if it doesn't exist
    # For now, let's check if there's a delete endpoint
    
    try {
        $deleteResponse = Invoke-RestMethod -Uri "$baseURL/invoices/$cloudTestInvoiceId" -Method Delete -Headers $headers
        Write-Host "✅ Invoice deleted successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Delete endpoint not available: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "We'll need to add a delete endpoint to the invoice routes." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Add a delete endpoint to invoice routes" -ForegroundColor White
Write-Host "2. Or manually fix the PDF path in the database" -ForegroundColor White
