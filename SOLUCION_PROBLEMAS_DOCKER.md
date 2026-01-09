# Solución de Problemas con Docker y Pérdida de Conexión

Si al iniciar Docker pierdes conexión con los agentes o experimentas lentitud extrema, sigue estos pasos en orden.

## 1. Verificación de Recursos (RAM/CPU) - Causa Frecuente
El sistema de Supabase levanta múltiples contenedores (Database, Studio, API, etc.), lo cual consume mucha RAM. Si tu PC llega al 100% de memoria, el sistema operativo puede cortar procesos secundarios como el agente de IA.

**Solución:**
1. Abre **Docker Desktop**.
2. Ve a **Settings (Configuración) ⚙️** > **Resources**.
3. Asegúrate de limitar el uso de memoria. Si tienes 16GB, asigna máx **6GB** u **8GB** a Docker, no más.
4. Reduce la CPU si está al máximo.
5. Haz clic en **Apply & Restart**.

## 2. Conflicto de Red (IP Address Conflict)
Docker crea una red virtual. A veces, esta red usa la misma dirección IP que tu internet o tu VPN, cortando tu conexión externa.

**Solución:**
1. Abre **Docker Desktop**.
2. Ve a **Settings** > **Resources** > **Network**.
3. Verifica la "Subnet Address". Por defecto suele ser `172.17.0.0/16` o similar.
4. Si esto coincide con tu IP local, cámbialo a otro rango, por ejemplo: `192.168.50.0/24` (o un rango que sepas que está libre).
5. **Apply & Restart**.

## 3. Limpieza de Contenedores (Reset Profundo)
A veces contenedores antiguos o mal configurados saturan la red.

**Ejecuta estos comandos en tu terminal (PowerShell) en la carpeta del proyecto:**

```powershell
# 1. Detener Supabase forzadamente
npx supabase stop --no-backup

# 2. Limpiar sistema de Docker (borra contenedores y redes no usadas)
docker system prune -f

# 3. Iniciar Supabase nuevamente
npx supabase start
```

## 4. Modo Ligero (Opcional)
Si tu PC sufre mucho, puedes intentar deshabilitar servicios no esenciales en `supabase/config.toml` temporalmente (aunque Nexus BE LEAN suele requerir la mayoría).
- Studio (`studio.enabled = false`) 
- Analytics (`analytics.enabled = false`)
- Logflare

*Nota: Solo haz esto si es estrictamente necesario.*
