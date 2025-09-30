# Test admin authentication and invoice fetching
$baseURL = "http://localhost:4000/api"

Write-Host "=== Testing Admin Authentication ===" -ForegroundColor Yellow

# Test 1: Try to login with default credentials
Write-Host "1. Testing login with default super admin credentials..." -ForegroundColor Cyan

$loginData = @{
    email = "superadmin@tg.local"
    password = "SuperAdmin@12345"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseURL/admin/login" -Method Post -Body $loginData -ContentType "application/json"
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "Admin: $($loginResponse.admin | ConvertTo-Json)" -ForegroundColor Green
    
    $token = $loginResponse.token
    
    # Test 2: Test invoices endpoint with token
    Write-Host "`n2. Testing invoices endpoint with token..." -ForegroundColor Cyan
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $invoicesResponse = Invoke-RestMethod -Uri "$baseURL/invoices/admin" -Method Get -Headers $headers
    
    Write-Host "✅ Invoices endpoint working!" -ForegroundColor Green
    Write-Host "Response: $($invoicesResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    
    # Get more detailed error information
    if ($_.Exception.Response) {
        $errorDetails = $_.ErrorDetails.Message
        Write-Host "Error details: $errorDetails" -ForegroundColor Red
    }
    
    # Test health endpoint
    Write-Host "`n3. Checking if server is accessible..." -ForegroundColor Cyan
    try {
        $healthResponse = Invoke-RestMethod -Uri "http://localhost:4000/health" -Method Get
        Write-Host "Health check: $($healthResponse | ConvertTo-Json)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
