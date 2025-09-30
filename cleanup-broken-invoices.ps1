# Delete invoices with missing PDF files
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
    
    # List of invoices with missing PDF files (from our analysis)
    $brokenInvoiceIds = @(
        "68ae974518307342b831e733",  # INV-1756272452959
        "68ae973d18307342b831e72c",  # INV-1756272445225  
        "68adec9daa7ceec9f9d0161c",  # INV-1756228765933
        "68a7f49aa7d62c19d111a7f4"   # INV-1755837594020
    )
    
    Write-Host "`nDeleting broken invoices..." -ForegroundColor Yellow
    
    foreach ($invoiceId in $brokenInvoiceIds) {
        try {
            $deleteResponse = Invoke-RestMethod -Uri "$baseURL/invoices/$invoiceId" -Method Delete -Headers $headers
            Write-Host "✅ Deleted invoice $invoiceId" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to delete $invoiceId`: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "`n✅ Cleanup completed!" -ForegroundColor Green
    Write-Host "Refresh your browser to see only working invoices." -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
}
