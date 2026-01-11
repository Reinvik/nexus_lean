@echo off
echo ========================================
echo  NEXUS LEAN - MODO PRODUCCION
echo ========================================
echo.
echo [ADVERTENCIA] Datos REALES
echo.
copy /Y ".env.production" ".env.local" > nul
echo Entorno: PRODUCCION
echo URL: https://qtzpzgwyjptbnipvyjdu.supabase.co
echo.
npm run dev
