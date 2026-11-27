# =====================================================
# JalRakshak AI - upload code to the ESP32 and connect it
# to the website.
#
#   1. Finds the ESP32's COM port
#   2. Uploads JalRakshakDevice.ino (skip with -NoUpload)
#   3. Starts the USB bridge (ESP32 -> website -> LCD)
#
# Run from the jalrakshak-ai folder:
#   powershell -ExecutionPolicy Bypass -File esp32\connect-esp32.ps1
#   powershell -ExecutionPolicy Bypass -File esp32\connect-esp32.ps1 -NoUpload
# =====================================================

param(
    [switch]$NoUpload
)

$ErrorActionPreference = "Stop"

$root    = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$python  = Join-Path $backend ".venv-local\Scripts\python.exe"
$cli     = "D:\arduino-cli\arduino-cli.exe"
$sketch  = Join-Path $PSScriptRoot "JalRakshakDevice"

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

# ---------------------------------------------------
# 1. Find the ESP32
# ---------------------------------------------------
Step "Looking for the ESP32..."

$port = & $python -c "import sys; sys.path.insert(0, r'$backend'); from esp32_bridge import find_esp32_port; p, c = find_esp32_port(); print(p or '')"
$port = "$port".Trim()

if (-not $port) {
    Write-Host "ESP32 not found on any COM port." -ForegroundColor Red
    Write-Host "- Install the CP210x driver (Device Manager must show it under 'Ports (COM & LPT)')."
    Write-Host "- Use a USB DATA cable (charge-only cables do not work)."
    Write-Host "- Close Arduino IDE Serial Monitor if it is open."
    exit 1
}

Write-Host "ESP32 found on $port" -ForegroundColor Green

# ---------------------------------------------------
# 2. Upload the code
# ---------------------------------------------------
if (-not $NoUpload) {
    Step "Uploading JalRakshak code to the ESP32 (about 1 minute)..."
    Write-Host "If it says 'Connecting......' for a long time, HOLD the BOOT button on the ESP32 until it starts writing."

    & $cli compile --upload --port $port --fqbn esp32:esp32:esp32 $sketch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Upload failed. Hold the BOOT button and run this again." -ForegroundColor Red
        exit 1
    }

    Write-Host "Upload complete. The LCD should now show readings." -ForegroundColor Green
    Start-Sleep -Seconds 3
}

# ---------------------------------------------------
# 3. USB bridge
# ---------------------------------------------------
Step "Starting the ESP32 bridge on $port..."

Start-Process cmd -ArgumentList "/k title JalRakshak ESP32 Bridge && cd /d `"$backend`" && `"$python`" esp32_bridge.py --port $port"

Write-Host "`nDone! Your physical ESP32 is now sending sensor readings to JalRakshak AI." -ForegroundColor Green
Write-Host "Keep the 'JalRakshak ESP32 Bridge' window open."
