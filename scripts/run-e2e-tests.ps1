# اسکریپت اجرای تست‌های E2E
# این اسکریپت ابتدا سرور را چک می‌کند و سپس تست‌ها را اجرا می‌کند

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   اجرای تست‌های E2E با Playwright" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# تابع برای چک کردن در دسترس بودن پورت
function Test-Port {
    param (
        [string]$Host,
        [int]$Port
    )
    
    try {
        $connection = New-Object System.Net.Sockets.TcpClient($Host, $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# چک کردن وضعیت سرور
Write-Host "🔍 بررسی وضعیت سرور..." -ForegroundColor Yellow
Write-Host ""

$frontendRunning = Test-Port -Host "127.0.0.1" -Port 5173
$backendRunning = Test-Port -Host "127.0.0.1" -Port 3001

if ($frontendRunning) {
    Write-Host "✅ Frontend در حال اجرا است (پورت 5173)" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend در حال اجرا نیست (پورت 5173)" -ForegroundColor Red
}

if ($backendRunning) {
    Write-Host "✅ Backend در حال اجرا است (پورت 3001)" -ForegroundColor Green
} else {
    Write-Host "❌ Backend در حال اجرا نیست (پورت 3001)" -ForegroundColor Red
}

Write-Host ""

# اگر سرورها در حال اجرا نیستند، پیام راهنما نمایش بده
if (-not $frontendRunning -or -not $backendRunning) {
    Write-Host "⚠️  توجه: سرورها در حال اجرا نیستند!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "لطفاً ابتدا سرور را در یک ترمینال جدید اجرا کنید:" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "سپس منتظر بمانید تا سرور کاملاً راه‌اندازی شود (10-30 ثانیه)" -ForegroundColor Yellow
    Write-Host ""
    
    $response = Read-Host "آیا می‌خواهید سرور را اکنون اجرا کنید؟ (y/n)"
    
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host ""
        Write-Host "🚀 در حال اجرای سرور..." -ForegroundColor Green
        Write-Host "لطفاً منتظر بمانید تا سرور آماده شود..." -ForegroundColor Yellow
        Write-Host ""
        
        # اجرای سرور در پس‌زمینه
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
        
        Write-Host "⏳ منتظر راه‌اندازی سرور..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        
        # چک مجدد
        $frontendRunning = Test-Port -Host "127.0.0.1" -Port 5173
        $backendRunning = Test-Port -Host "127.0.0.1" -Port 3001
        
        if (-not $frontendRunning -or -not $backendRunning) {
            Write-Host ""
            Write-Host "❌ سرور هنوز آماده نیست. لطفاً کمی بیشتر صبر کنید." -ForegroundColor Red
            Write-Host "سپس این اسکریپت را دوباره اجرا کنید." -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host ""
        Write-Host "لطفاً ابتدا سرور را اجرا کنید و سپس این اسکریپت را دوباره اجرا کنید." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "🧪 اجرای تست‌های Playwright..." -ForegroundColor Green
Write-Host ""

# اجرای تست‌ها
npm run e2e:smoke

$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "✅ تست‌ها با موفقیت اجرا شدند!" -ForegroundColor Green
} else {
    Write-Host "❌ برخی تست‌ها ناموفق بودند." -ForegroundColor Red
    Write-Host ""
    Write-Host "برای مشاهده گزارش کامل:" -ForegroundColor Yellow
    Write-Host "  npx playwright show-report" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

exit $exitCode

