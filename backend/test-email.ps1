# MatchTracker Email Service Test Script
# Quick test for email functionality

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   MatchTracker Email Service Test Tool    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ .env.local file not found!" -ForegroundColor Red
    Write-Host "Please create .env.local with your Mailgun credentials" -ForegroundColor Yellow
    exit 1
}

# Get recipient email
$email = Read-Host "Enter recipient email address"

if ([string]::IsNullOrWhiteSpace($email) -or -not ($email -match "^[^@]+@[^@]+\.[^@]+$")) {
    Write-Host "❌ Invalid email address!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Select test type:" -ForegroundColor Yellow
Write-Host "1. Simple Test Email" -ForegroundColor White
Write-Host "2. Match Reminder Email (requires match ID)" -ForegroundColor White
Write-Host "3. Welcome Email" -ForegroundColor White
Write-Host "4. All Tests" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

Write-Host ""
Write-Host "🚀 Running email service test..." -ForegroundColor Cyan
Write-Host ""

# Run the Node.js test script
try {
    switch ($choice) {
        "1" {
            Write-Host "📧 Testing Simple Email..." -ForegroundColor Yellow
            node test-email-service.js <<< "$email`n1"
        }
        "2" {
            Write-Host "⚽ Testing Match Reminder Email..." -ForegroundColor Yellow
            node test-email-service.js <<< "$email`n2"
        }
        "3" {
            Write-Host "👋 Testing Welcome Email..." -ForegroundColor Yellow
            node test-email-service.js <<< "$email`n3"
        }
        "4" {
            Write-Host "🔄 Running All Tests..." -ForegroundColor Yellow
            node test-email-service.js <<< "$email`n4"
        }
        default {
            Write-Host "❌ Invalid choice!" -ForegroundColor Red
            exit 1
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Test completed! Check your email inbox." -ForegroundColor Green
        Write-Host ""
        Write-Host "💡 Tip: If you don't receive the email:" -ForegroundColor Yellow
        Write-Host "   1. Check your spam/junk folder" -ForegroundColor White
        Write-Host "   2. Verify your Mailgun domain is verified" -ForegroundColor White
        Write-Host "   3. If using sandbox domain, ensure recipient is authorized" -ForegroundColor White
        Write-Host "   4. Check Mailgun logs at https://app.mailgun.com/logs" -ForegroundColor White
        Write-Host ""
    }
    else {
        Write-Host ""
        Write-Host "❌ Test failed. Check the error messages above." -ForegroundColor Red
        Write-Host ""
    }
}
catch {
    Write-Host "❌ Error running test: $_" -ForegroundColor Red
    exit 1
}
