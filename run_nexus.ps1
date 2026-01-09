# Detectar automáticamente el directorio del usuario actual
$NodePath = "$env:LOCALAPPDATA\Programs\Antigravity\node_portable"
$JavaPath = "C:\Proyectos\java-1.8.0-openjdk-1.8.0.392-1.b08.redhat.windows.x86_64\bin"

# Verificar si el path de Node existe
if (Test-Path $NodePath) {
    $env:Path = "$NodePath;" + $env:Path
    Write-Host "✓ Node.js portable detectado en: $NodePath" -ForegroundColor Green
}
else {
    Write-Host "⚠ Advertencia: No se encontró Node.js portable en $NodePath" -ForegroundColor Yellow
    Write-Host "  Usando Node.js del sistema..." -ForegroundColor Yellow
}

# Verificar si el path de Java existe
if (Test-Path $JavaPath) {
    $env:Path = "$JavaPath;" + $env:Path
    Write-Host "✓ Java detectado en: $JavaPath" -ForegroundColor Green
    $env:JAVA_HOME = "C:\Proyectos\java-1.8.0-openjdk-1.8.0.392-1.b08.redhat.windows.x86_64"
}
else {
    Write-Host "⚠ Advertencia: No se encontró Java en $JavaPath" -ForegroundColor Yellow
}

Set-Location "$PSScriptRoot"
Write-Host "$(Get-Date -Format 'HH:mm:ss') - Iniciando Nexus BE-LEAN..." -ForegroundColor Cyan
npm run dev
    