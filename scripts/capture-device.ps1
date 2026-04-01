# capture-device.ps1 — Screenshot capture for cliniq.one Capacitor apps
# Usage:
#   .\scripts\capture-device.ps1 -App doctor -Mode manual
#   .\scripts\capture-device.ps1 -App patient -Mode timer -Interval 3
#   .\scripts\capture-device.ps1 -App admin -Mode watch

param(
    [ValidateSet('patient', 'doctor', 'admin')]
    [string]$App = 'patient',
    
    [ValidateSet('timer', 'manual', 'watch')]
    [string]$Mode = 'manual',
    
    [int]$Interval = 3
)

# Find ADB
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) {
    $found = Get-Command adb -ErrorAction SilentlyContinue
    if ($found) { $adb = $found.Source } else { Write-Host 'ADB not found.' -ForegroundColor Red; exit 1 }
}

# Setup output directory
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$outputDir = Join-Path $PSScriptRoot ('..\debug-captures\' + $App + '_' + $timestamp)
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$appIds = @{ patient = 'com.cliniqone.patient'; doctor = 'com.cliniqone.doctor'; admin = 'com.cliniqone.admin' }
$appId = $appIds[$App]

Write-Host ''
Write-Host '  cliniq.one Device Screenshot Capture' -ForegroundColor Cyan
Write-Host ('  App: ' + $App + '  |  Mode: ' + $Mode) -ForegroundColor White
Write-Host ''

# Verify device
$devicesRaw = & $adb devices 2>&1
$devicesStr = ($devicesRaw | Out-String)
if ($devicesStr -notmatch '\w+\s+device\b') { Write-Host 'No device connected.' -ForegroundColor Red; exit 1 }
Write-Host '  Device connected' -ForegroundColor Green

# Launch app
Write-Host ('  Launching ' + $App + '...') -ForegroundColor Yellow
& $adb shell am start -n ($appId + '/.MainActivity') 2>&1 | Out-Null
Start-Sleep -Seconds 2

# Counter
$script:captureCount = 0

function Capture-Screen {
    param([string]$Label = '')
    $script:captureCount++
    $num = $script:captureCount.ToString('D3')
    $ts = Get-Date -Format 'HH-mm-ss'
    $safeName = if ($Label) { '_' + ($Label -replace '[^a-zA-Z0-9]', '_') } else { '' }
    $filename = $num + '_' + $ts + $safeName + '.png'
    $localPath = Join-Path $script:outputDir $filename
    $remotePath = '/sdcard/cap_screenshot.png'

    & $script:adb shell screencap -p $remotePath 2>&1 | Out-Null
    & $script:adb pull $remotePath $localPath 2>&1 | Out-Null
    & $script:adb shell rm $remotePath 2>&1 | Out-Null

    Write-Host ('  #' + $num + ' captured -> ' + $filename) -ForegroundColor Green
}

function Capture-Logcat {
    $logFile = Join-Path $script:outputDir 'logcat_latest.txt'
    $appPid = & $script:adb shell pidof $script:appId 2>$null
    if ($appPid) { & $script:adb logcat -d -t 50 --pid=$appPid 2>&1 | Out-File -FilePath $logFile -Force }
}

# === MANUAL MODE ===
if ($Mode -eq 'manual') {
    Write-Host ''
    Write-Host '  MANUAL MODE' -ForegroundColor Cyan
    Write-Host '  Navigate on phone, press Enter here to capture.' -ForegroundColor White
    Write-Host '  Type a label (e.g. home_page) then Enter, or just Enter.' -ForegroundColor DarkGray
    Write-Host '  Type q to quit.' -ForegroundColor DarkGray
    Write-Host ''
    while ($true) {
        $userInput = Read-Host '  Label (or Enter/q)'
        if ($userInput -eq 'q') { break }
        Capture-Screen -Label $userInput
        Capture-Logcat
    }
}

# === TIMER MODE ===
elseif ($Mode -eq 'timer') {
    Write-Host ''
    Write-Host ('  TIMER MODE - every ' + $Interval + 's. Ctrl+C to stop.') -ForegroundColor Cyan
    Write-Host ''
    try {
        while ($true) {
            Capture-Screen
            Capture-Logcat
            Start-Sleep -Seconds $Interval
        }
    } finally {}
}

# === WATCH MODE ===
elseif ($Mode -eq 'watch') {
    Write-Host ''
    Write-Host '  WATCH MODE - captures on screen change. Ctrl+C to stop.' -ForegroundColor Cyan
    Write-Host ''
    $lastActivity = ''
    try {
        while ($true) {
            $cur = & $adb shell 'dumpsys activity activities | grep mResumedActivity' 2>&1
            if ($cur -ne $lastActivity -and $cur -match $appId) {
                Start-Sleep -Milliseconds 800
                $actLabel = if ($cur -match '(\w+Activity)') { $Matches[1] } else { '' }
                Capture-Screen -Label $actLabel
                Capture-Logcat
                $lastActivity = $cur
            }
            Start-Sleep -Milliseconds 500
        }
    } finally {}
}

# === Generate HTML Report ===
Write-Host ''
Write-Host '  Generating report...' -ForegroundColor Yellow

$images = Get-ChildItem $outputDir -Filter '*.png' | Sort-Object Name

$html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
$html += '<title>Debug - ' + $App + '</title>'
$html += '<style>'
$html += 'body{background:#0A0E1A;color:#F1F5F9;font-family:system-ui;padding:24px}'
$html += 'h1{color:#2DD4BF;font-size:24px;margin-bottom:8px}'
$html += '.meta{color:#64748B;font-size:13px;margin-bottom:32px}'
$html += '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}'
$html += '.card{background:#111827;border:1px solid #1E293B;border-radius:16px;overflow:hidden}'
$html += '.card img{width:100%;display:block;cursor:pointer}'
$html += '.card .name{padding:12px 16px;font-size:13px;font-weight:600}'
$html += '.fs{display:none;position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:100;justify-content:center;align-items:center;cursor:pointer}'
$html += '.fs.active{display:flex}'
$html += '.fs img{max-width:90vw;max-height:90vh;border-radius:12px}'
$html += '</style></head><body>'
$html += '<h1>Debug Capture - ' + $App + '</h1>'
$html += '<p class="meta">' + $timestamp + ' - ' + $images.Count + ' screenshots</p>'
$html += '<div class="grid">'

foreach ($img in $images) {
    $html += '<div class="card">'
    $html += '<img src="' + $img.Name + '" onclick="document.getElementById(''fs'').classList.add(''active'');document.getElementById(''fsimg'').src=this.src" />'
    $html += '<div class="name">' + $img.BaseName + '</div></div>'
}

$html += '</div>'
$html += '<div id="fs" class="fs" onclick="this.classList.remove(''active'')"><img id="fsimg" /></div>'
$html += '</body></html>'

$reportPath = Join-Path $outputDir 'report.html'
$html | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host ''
Write-Host ('  ' + $images.Count + ' screenshots captured') -ForegroundColor Green
Write-Host ('  Report: ' + $reportPath) -ForegroundColor Green
Write-Host ('  Folder: ' + $outputDir) -ForegroundColor Green
Write-Host ''
