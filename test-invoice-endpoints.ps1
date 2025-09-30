# Test invoice view and download endpoints
$baseURL = "http://localhost:4000/api"

Write-Host "=== Testing Invoice Endpoints ===" -ForegroundColor Yellow

# First login to get token
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
    
    Write-Host "✅ Authentication successful!" -ForegroundColor Green
    
    # Get all invoices first
    Write-Host "`n1. Getting all invoices..." -ForegroundColor Cyan
    $invoicesResponse = Invoke-RestMethod -Uri "$baseURL/invoices/admin" -Method Get -Headers $headers
    
    if ($invoicesResponse.invoices.Count -gt 0) {
        $invoice = $invoicesResponse.invoices[0]
        $invoiceId = $invoice._id
        Write-Host "Found invoice: $($invoice.invoiceNo) (ID: $invoiceId)" -ForegroundColor Green
        
        # Test view endpoint
        Write-Host "`n2. Testing view endpoint..." -ForegroundColor Cyan
        try {
            $viewResponse = Invoke-RestMethod -Uri "$baseURL/invoices/$invoiceId/view" -Method Get -Headers $headers
            Write-Host "✅ View endpoint working!" -ForegroundColor Green
        } catch {
            Write-Host "❌ View endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.ErrorDetails.Message) {
                $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
                if ($errorObj) {
                    Write-Host "Error details: $($errorObj.error)" -ForegroundColor Red
                } else {
                    Write-Host "Error details: $($_.ErrorDetails.Message)" -ForegroundColor Red
                }
            }
        }
        
        # Test download endpoint
        Write-Host "`n3. Testing download endpoint..." -ForegroundColor Cyan
        try {
            $downloadResponse = Invoke-RestMethod -Uri "$baseURL/invoices/$invoiceId/download" -Method Get -Headers $headers
            Write-Host "✅ Download endpoint working!" -ForegroundColor Green
        } catch {
            Write-Host "❌ Download endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.ErrorDetails.Message) {
                $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
                if ($errorObj) {
                    Write-Host "Error details: $($errorObj.error)" -ForegroundColor Red
                } else {
                    Write-Host "Error details: $($_.ErrorDetails.Message)" -ForegroundColor Red
                }
            }
        }
        
        # Show invoice details
        Write-Host "`n4. Invoice details:" -ForegroundColor Cyan
        Write-Host ($invoice | ConvertTo-Json -Depth 2) -ForegroundColor White
        
    } else {
        Write-Host "No invoices found to test" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
}
