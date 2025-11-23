# ========================================
# اسکریپت جامع اجرای پروژه
# یک کلیک - بدون مشکل
# ========================================

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🚀 DreamMaker Crypto Trader" -ForegroundColor Cyan
Write-Host "  یک کلیک - اجرای کامل پروژه" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# تنظیم مسیر پروژه
$ProjectPath = "C:\project\DreammakerCryptoSignalAndTrader-CLEAN-PATCH7"
Set-Location $ProjectPath

# بررسی وجود node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 نصب وابستگی‌ها..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ خطا در نصب وابستگی‌ها" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ وابستگی‌ها نصب شدند" -ForegroundColor Green
}

# بررسی پورت‌های در حال استفاده
Write-Host "`n🔍 بررسی پورت‌ها..." -ForegroundColor Cyan

$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

if ($port3001) {
    Write-Host "⚠️  پورت 3001 در حال استفاده است. بستن پروسه..." -ForegroundColor Yellow
    $processes = Get-Process | Where-Object {$_.Id -in $port3001.OwningProcess}
    foreach ($proc in $processes) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

if ($port5173) {
    Write-Host "⚠️  پورت 5173 در حال استفاده است. بستن پروسه..." -ForegroundColor Yellow
    $processes = Get-Process | Where-Object {$_.Id -in $port5173.OwningProcess}
    foreach ($proc in $processes) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

Write-Host "✅ پورت‌ها آزاد هستند" -ForegroundColor Green

# شروع Backend
Write-Host "`n🔧 شروع Backend (پورت 3001)..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location "C:\project\DreammakerCryptoSignalAndTrader-CLEAN-PATCH7"
    npm run dev:server 2>&1
}

Write-Host "⏳ انتظار برای آماده شدن Backend..." -ForegroundColor Yellow
$backendReady = $false
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 2
    try {
        $test = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        $backendReady = $true
        Write-Host "✅ Backend آماده است!" -ForegroundColor Green
        break
    } catch {
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
}

Write-Host ""

if (-not $backendReady) {
    Write-Host "❌ Backend شروع نشد. خطاها:" -ForegroundColor Red
    Receive-Job $backendJob | Select-Object -Last 30
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    exit 1
}

# تست سریع Backend
Write-Host "`n🧪 تست Backend..." -ForegroundColor Cyan
$tests = @(
    @{Name="Health"; Url="http://localhost:3001/api/health"},
    @{Name="Resources"; Url="http://localhost:3001/api/resources/stats"}
)

$allPassed = $true
foreach ($test in $tests) {
    Write-Host "  • $($test.Name)..." -NoNewline -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri $test.Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host " ✅" -ForegroundColor Green
        } else {
            Write-Host " ⚠️ ($($response.StatusCode))" -ForegroundColor Yellow
            $allPassed = $false
        }
    } catch {
        Write-Host " ❌" -ForegroundColor Red
        $allPassed = $false
    }
}

if (-not $allPassed) {
    Write-Host "`n⚠️  برخی تست‌ها ناموفق بودند، اما ادامه می‌دهیم..." -ForegroundColor Yellow
}

# شروع Frontend
Write-Host "`n🎨 شروع Frontend (پورت 5173)..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "C:\project\DreammakerCryptoSignalAndTrader-CLEAN-PATCH7"
    npm run dev:client 2>&1
}

Write-Host "⏳ انتظار برای آماده شدن Frontend..." -ForegroundColor Yellow
$frontendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $test = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        $frontendReady = $true
        Write-Host "✅ Frontend آماده است!" -ForegroundColor Green
        break
    } catch {
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
}

Write-Host ""

if (-not $frontendReady) {
    Write-Host "⚠️  Frontend شروع نشد، اما Backend در حال اجراست" -ForegroundColor Yellow
}

# نمایش اطلاعات
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ✅ پروژه با موفقیت اجرا شد!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 لینک‌های دسترسی:" -ForegroundColor Cyan
Write-Host "  • Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "  • Backend:   http://localhost:3001" -ForegroundColor White
Write-Host "  • API Docs:  http://localhost:3001/api/health" -ForegroundColor White
Write-Host "  • Resources: http://localhost:3001/api/resources/stats" -ForegroundColor White
Write-Host ""
Write-Host "📊 وضعیت:" -ForegroundColor Cyan
Write-Host "  • Backend:  $(if ($backendReady) { '✅ Running' } else { '❌ Failed' })" -ForegroundColor $(if ($backendReady) { 'Green' } else { 'Red' })
Write-Host "  • Frontend: $(if ($frontendReady) { '✅ Running' } else { '⚠️  Check manually' })" -ForegroundColor $(if ($frontendReady) { 'Green' } else { 'Yellow' })
Write-Host ""
Write-Host "⚠️  برای توقف پروژه، این پنجره را ببندید یا Ctrl+C بزنید" -ForegroundColor Yellow
Write-Host ""

# نمایش لاگ‌های زنده
Write-Host "📝 لاگ‌های Backend (آخرین 10 خط):" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Gray
Receive-Job $backendJob | Select-Object -Last 10
Write-Host "========================================" -ForegroundColor Gray
Write-Host ""

# باز کردن مرورگر
Write-Host "🌐 باز کردن مرورگر..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host "`n✅ همه چیز آماده است! پروژه در حال اجراست." -ForegroundColor Green
Write-Host "   برای مشاهده لاگ‌های زنده، این پنجره را باز نگه دارید." -ForegroundColor Yellow
Write-Host ""

# نگه داشتن پروسه‌ها و نمایش لاگ‌ها
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # بررسی وضعیت Backend
        try {
            $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        } catch {
            Write-Host "`n❌ Backend متوقف شد!" -ForegroundColor Red
            break
        }
    }
} finally {
    Write-Host "`n🛑 توقف پروژه..." -ForegroundColor Yellow
    
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    
    Write-Host "✅ پروژه متوقف شد." -ForegroundColor Green
}

