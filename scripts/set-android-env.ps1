# Define ANDROID_HOME e adiciona platform-tools ao PATH para a sessão atual do PowerShell.
# Execute: .\scripts\set-android-env.ps1
# Depois rode o Expo (ex.: cd apps/mobile && npx expo start --android).

$defaultSdkPath = "$env:LOCALAPPDATA\Android\Sdk"

if (-not (Test-Path $defaultSdkPath)) {
    Write-Host "Android SDK nao encontrado em: $defaultSdkPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Instale o Android Studio e conclua o Setup Wizard (incluindo Android SDK)." -ForegroundColor Cyan
    Write-Host "Ou defina ANDROID_HOME manualmente se o SDK estiver em outro local." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Para rodar o app sem emulador:" -ForegroundColor Green
    Write-Host "  cd apps/mobile && npm run web     # navegador" -ForegroundColor Gray
    Write-Host "  ou use Expo Go no celular e escaneie o QR code." -ForegroundColor Gray
    exit 1
}

$env:ANDROID_HOME = $defaultSdkPath
$platformTools = Join-Path $defaultSdkPath "platform-tools"
$emulator = Join-Path $defaultSdkPath "emulator"

if (Test-Path $platformTools) {
    $env:Path = "$platformTools;$env:Path"
}
if (Test-Path $emulator) {
    $env:Path = "$emulator;$env:Path"
}

Write-Host "ANDROID_HOME definido para esta sessao: $env:ANDROID_HOME" -ForegroundColor Green
Write-Host "Agora execute: cd apps/mobile && npx expo start --android" -ForegroundColor Cyan
