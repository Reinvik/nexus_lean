N$NodePath = "C:\Users\ariel.mella\AppData\Local\Programs\Antigravity\node_portable"
$env:Path = "$NodePath;" + $env:Path
Set-Location "$PSScriptRoot"
Write-Host "Iniciando Nexus BE-LEAN..."
npm run dev
