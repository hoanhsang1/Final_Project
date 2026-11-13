# Mo Cloudflare Quick Tunnel tro ve API Gateway chay tren may ca nhan.
# Chay: powershell -ExecutionPolicy Bypass -File scripts/start-tunnel.ps1
# Hoac double-click scripts/start-tunnel.bat
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$vercelJson = Join-Path $repoRoot 'frontend/vercel.json'
$gatewayUrl = 'http://localhost:8080'

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host 'Khong tim thay cloudflared.' -ForegroundColor Red
    Write-Host 'Cai bang: winget install --id Cloudflare.cloudflared' -ForegroundColor Yellow
    exit 1
}

# Gateway chua bat thi tunnel van mo nhung se tra 502.
$tcp = New-Object System.Net.Sockets.TcpClient
try {
    $tcp.Connect('127.0.0.1', 8080)
} catch {
    Write-Host 'CANH BAO: khong ket noi duoc localhost:8080. Hay bat backend truoc.' -ForegroundColor Yellow
} finally {
    $tcp.Dispose()
}

Write-Host "Dang mo tunnel toi $gatewayUrl ..." -ForegroundColor Cyan

$logFile = Join-Path $env:TEMP 'mems-cloudflared.log'
Remove-Item -LiteralPath $logFile -ErrorAction SilentlyContinue

$proc = Start-Process -FilePath 'cloudflared' `
    -ArgumentList @('tunnel', '--url', $gatewayUrl, '--no-autoupdate') `
    -RedirectStandardError $logFile `
    -PassThru -NoNewWindow

$publicUrl = $null
$deadline = (Get-Date).AddSeconds(45)

while (-not $publicUrl -and -not $proc.HasExited -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 500
    if (Test-Path -LiteralPath $logFile) {
        try {
            $text = Get-Content -Raw -LiteralPath $logFile -ErrorAction Stop
        } catch {
            $text = ''
        }
        if ($text -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
            $publicUrl = $Matches[0]
        }
    }
}

if ($publicUrl) {
    $content = Get-Content -Raw -LiteralPath $vercelJson
    $content = [regex]::Replace($content, 'https://[a-z0-9-]+\.trycloudflare\.com', $publicUrl)
    [System.IO.File]::WriteAllText($vercelJson, $content)

    Write-Host ''
    Write-Host "Da cap nhat frontend/vercel.json -> $publicUrl" -ForegroundColor Green
    Write-Host 'Commit + push de Vercel deploy lai:' -ForegroundColor Yellow
    Write-Host '  git add frontend/vercel.json' -ForegroundColor Yellow
    Write-Host '  git commit -m "chore: update tunnel url"' -ForegroundColor Yellow
    Write-Host '  git push' -ForegroundColor Yellow
} else {
    Write-Host 'Khong doc duoc URL tunnel. Xem log:' -ForegroundColor Red
    Write-Host "  $logFile" -ForegroundColor Red
}

Write-Host ''
Write-Host 'Tunnel dang chay. Nhan Ctrl+C de dung.' -ForegroundColor DarkGray

try {
    $proc.WaitForExit()
} finally {
    if (-not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force
    }
}
