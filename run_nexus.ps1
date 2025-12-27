# Detectar automáticamente el directorio del usuario actual
$NodePath = "$env:LOCALAPPDATA\Programs\Antigravity\node_portable"

# Verificar si el path existe
if (Test-Path $NodePath) {
    $env:Path = "$NodePath;" + $env:Path
    Write-Host "✓ Node.js portable detectado en: $NodePath" -ForegroundColor Green
} else {
    Write-Host "⚠ Advertencia: No se encontró Node.js portable en $NodePath" -ForegroundColor Yellow
    Write-Host "  Usando Node.js del sistema..." -ForegroundColor Yellow
}

Set-Location "$PSScriptRoot"
Write-Host "Iniciando Nexus BE-LEAN..." -ForegroundColor Cyan
npm run dev
