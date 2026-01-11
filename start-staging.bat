@echo off
echo ========================================
echo  NEXUS LEAN - MODO STAGING
echo ========================================
echo.
copy /Y ".env.staging" ".env.local" > nul
echo Entorno: STAGING (NexusStaging)
echo URL: https://iuzpgljjfeobxlptmsma.supabase.co
echo.
npm run dev
