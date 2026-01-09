# 🚀 Solución Rápida - Error 406

## Opción 1: Workaround Temporal (SIN acceso a Supabase SQL)

Si **NO puedes acceder al SQL Editor de Supabase**, podemos hacer un workaround temporal:

### Paso 1: Deshabilitar temporalmente la consulta de perfiles

Edita `src/context/AuthContext.jsx` y reemplaza la función `fetchProfile` con esta versión simplificada:

```javascript
const fetchProfile = async (authUser) => {
    const isSuperAdmin = authUser.email === 'ariel.mellag@gmail.com';
    
    console.log("AuthContext: Usando modo fallback (sin consulta DB)");
    
    // Usar solo datos del auth user, sin consultar la tabla profiles
    setUser({
        ...authUser,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
        role: isSuperAdmin ? 'admin' : 'user',
        isAuthorized: true, // Permitir acceso temporal
        companyId: null, // Esto limitará algunas funcionalidades
        email: authUser.email
    });
};
```

**Limitaciones de este workaround:**
- ❌ No tendrás asignación de empresa (companyId será null)
- ❌ No se guardará el avatar
- ✅ Podrás acceder a la aplicación
- ✅ Las funcionalidades básicas funcionarán

---

## Opción 2: Solución Completa (CON acceso a Supabase)

### Paso A: Acceder a Supabase

1. Ve a: https://supabase.com/dashboard
2. Inicia sesión
3. Selecciona tu proyecto: `qtzpzgwyjptbnipvyjdu`
4. En el menú lateral, haz clic en **SQL Editor**

### Paso B: Ejecutar Script de Diagnóstico

Copia y pega este script SIMPLIFICADO:

```sql
-- 1. Verificar si tu perfil existe
SELECT * FROM public.profiles 
WHERE email = 'Ariel.mellag@gmail.com';

-- 2. Si NO existe, créalo:
INSERT INTO public.profiles (id, email, name, role, is_authorized)
SELECT 
    id,
    email,
    'Ariel Mella',
    'admin',
    true
FROM auth.users
WHERE email = 'Ariel.mellag@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', is_authorized = true;

-- 3. Verificar que se creó:
SELECT * FROM public.profiles 
WHERE email = 'Ariel.mellag@gmail.com';
```

### Paso C: Verificar Políticas RLS

Si el paso B no funciona, ejecuta esto:

```sql
-- Deshabilitar RLS temporalmente para testing
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ⚠️ IMPORTANTE: Esto es SOLO para testing
-- Después de confirmar que funciona, vuelve a habilitarlo con:
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

---

## Opción 3: Solución Alternativa - Usar Variables de Entorno

Podemos hacer que la app funcione sin la tabla profiles usando solo autenticación:

### Crear archivo `.env.local`:

```env
VITE_SUPABASE_URL=https://qtzpzgwyjptbnipvyjdu.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_aqui
VITE_BYPASS_PROFILE_CHECK=true
```

Luego modificaré el código para detectar esta variable.

---

## 🎯 ¿Cuál opción prefieres?

**Responde con el número:**

1. **Opción 1** - Workaround temporal (funciona ahora, limitado)
2. **Opción 2** - Solución completa (necesitas acceso a Supabase SQL)
3. **Opción 3** - Usar variables de entorno (requiere modificar código)
4. **Otra** - Describe tu situación

---

## 📞 Información que necesito:

Para ayudarte mejor, dime:

- ✅ ¿Tienes acceso al dashboard de Supabase?
- ✅ ¿Puedes ejecutar comandos SQL en Supabase?
- ✅ ¿Prefieres una solución temporal o completa?
- ✅ ¿Qué errores ves AHORA en la consola del navegador?

---

## 🔧 Mientras decides...

Puedo preparar cualquiera de las 3 opciones. Solo dime cuál prefieres y la implemento inmediatamente.
