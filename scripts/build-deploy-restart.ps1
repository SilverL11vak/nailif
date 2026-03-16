$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$port = 3003
$outLog = Join-Path $projectRoot ".dev-server.log"
$errLog = Join-Path $projectRoot ".dev-server.err.log"

Write-Host "==> Building app..."
cmd /c "if exist .next rmdir /s /q .next"
npm run build

Write-Host "==> Deploying to Vercel (preview)..."
$deployOutput = vercel deploy -y
$deployOutput | ForEach-Object { Write-Host $_ }

$previewUrl = $deployOutput | Where-Object { $_ -match "^https://.*vercel\.app" } | Select-Object -First 1
if ($previewUrl) {
  Write-Host "==> Preview URL: $previewUrl"
}

Write-Host "==> Restarting local dev server on port $port..."

try {
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($listeners) {
    $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
  }
} catch {
  Write-Host "Warning: Could not inspect/stop current process on port $port."
}

if (Test-Path $outLog) { Remove-Item $outLog -Force -ErrorAction SilentlyContinue }
if (Test-Path $errLog) { Remove-Item $errLog -Force -ErrorAction SilentlyContinue }

Start-Process -FilePath "npm.cmd" `
  -ArgumentList "run dev -- -p $port" `
  -WorkingDirectory $projectRoot `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog | Out-Null

Start-Sleep -Seconds 3

$isListening = $false
try {
  $isListening = (Test-NetConnection -ComputerName "localhost" -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded
} catch {
  $isListening = $false
}

if (-not $isListening) {
  Write-Host "Server did not start on port $port. Check logs:"
  Write-Host "  $outLog"
  Write-Host "  $errLog"
  exit 1
}

Write-Host "==> Done."
Write-Host "Local server: http://localhost:$port"
