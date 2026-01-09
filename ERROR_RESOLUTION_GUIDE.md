# Nexus BE LEAN - Error Resolution Guide

## Issues Identified and Fixed

### ✅ 1. Tailwind CDN Warning (FIXED)
**Error**: `cdn.tailwindcss.com should not be used in production`

**Root Cause**: The application was using the Tailwind CDN instead of the installed package.

**Solution Applied**:
- Created `tailwind.config.js` with proper content paths
- Created `postcss.config.js` to enable Tailwind processing
- Added `@tailwind` directives to `src/index.css`
- Removed CDN script tag from `index.html`

**Status**: ✅ Fixed - No action needed

---

### ⚠️ 2. 406 Not Acceptable Error (CRITICAL - REQUIRES DATABASE FIX)
**Error**: `GET https://qtzpzgwyjptbnipvyjdu.supabase.co/rest/v1/profiles?select=*&id=eq.155dc7e9-0c99-499a-8357-1c68185cd731 406 (Not Acceptable)`

**Root Cause**: This error typically occurs due to:
1. Row Level Security (RLS) policies blocking the query
2. Missing or incorrect Accept headers
3. Schema/permission issues in Supabase

**Solutions Applied**:

#### A. Code-Level Fixes (Already Applied)
1. **Enhanced Supabase Client** (`src/supabaseClient.js`):
   - Added explicit `Accept: application/json` headers
   - Configured auth options properly

2. **Improved AuthContext** (`src/context/AuthContext.jsx`):
   - Changed from `.single()` to `.maybeSingle()` to handle missing profiles gracefully
   - Removed timeout wrapper that was causing issues
   - Added detailed error logging to diagnose issues
   - Better fallback handling when profile fetch fails

#### B. Database-Level Fixes (REQUIRES MANUAL ACTION)
**⚠️ ACTION REQUIRED**: Run the SQL script in Supabase

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open the file `fix_406_error.sql` (created in project root)
4. Run the entire script

**What the script does**:
- Diagnoses the current state of the `profiles` table
- Checks and fixes RLS policies
- Ensures the `avatar_url` column exists
- Creates clearer, more permissive policies for authenticated users
- Grants necessary permissions

**Alternative Quick Fix** (if you have access to Supabase dashboard):
1. Go to **Authentication** → **Policies**
2. Find the `profiles` table
3. Temporarily **disable RLS** to test if that's the issue
4. If disabling RLS fixes it, re-enable and adjust policies

---

### ⚠️ 3. Recharts Dimension Warnings
**Warning**: `The width(-1) and height(-1) of chart should be greater than 0`

**Root Cause**: Charts are rendering before their containers have calculated dimensions.

**Current Status**: This is a **non-critical warning** that occurs during initial render. The charts should display correctly after the first render cycle.

**If charts are not displaying**:
1. Check that parent containers have defined dimensions
2. Ensure `ResponsiveContainer` has a fixed height prop (already implemented: `height={300}`)
3. The warning should disappear after the component mounts

---

## Testing Steps

After running the database fix script:

1. **Clear browser cache and localStorage**:
   ```javascript
   // Run in browser console
   localStorage.clear();
   location.reload();
   ```

2. **Restart the development server**:
   ```powershell
   # Stop current server (Ctrl+C)
   npm run dev
   ```

3. **Check the console for detailed error logs**:
   - Look for "AuthContext: Error fetching profile" messages
   - Check the error details object for specific error codes
   - Common error codes:
     - `PGRST116`: No rows found (not an error, handled gracefully)
     - `42501`: Insufficient privileges (RLS policy issue)
     - `406`: Content negotiation failed (Accept header issue)

4. **Verify login flow**:
   - Try logging in with `Ariel.mellag@gmail.com`
   - Check console for "Profile fetched successfully" message
   - Verify user object has all expected fields

---

## Additional Debugging

If issues persist after running the SQL script:

### Check Supabase Project Settings
1. Go to **Settings** → **API**
2. Verify that:
   - `anon` key is correct in `.env`
   - URL is correct in `.env`
   - RLS is enabled on `profiles` table

### Check Environment Variables
Verify your `.env` file has:
```env
VITE_SUPABASE_URL=https://qtzpzgwyjptbnipvyjdu.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Manual Profile Check
Run this in Supabase SQL Editor while logged in:
```sql
SELECT * FROM public.profiles WHERE id = auth.uid();
```

If this returns nothing, the profile wasn't created during signup.

### Create Missing Profile Manually
If profile is missing:
```sql
INSERT INTO public.profiles (id, email, name, role, is_authorized)
VALUES (
  '155dc7e9-0c99-499a-8357-1c68185cd731',
  'Ariel.mellag@gmail.com',
  'Ariel Mella',
  'admin',
  true
);
```

---

## Summary of Changes Made

### Files Modified:
1. ✅ `index.html` - Removed Tailwind CDN
2. ✅ `src/index.css` - Added Tailwind directives
3. ✅ `src/supabaseClient.js` - Enhanced configuration
4. ✅ `src/context/AuthContext.jsx` - Improved error handling

### Files Created:
1. ✅ `tailwind.config.js` - Tailwind configuration
2. ✅ `postcss.config.js` - PostCSS configuration
3. ✅ `fix_406_error.sql` - Database fix script

---

## Next Steps

1. **Run the SQL fix script** in Supabase SQL Editor
2. **Restart the dev server**: `npm run dev`
3. **Clear browser cache** and try logging in again
4. **Monitor console logs** for any remaining errors
5. If 406 errors persist, share the detailed error logs from the console

---

## Known Non-Critical Warnings

These warnings can be ignored:
- ✅ `Unknown at rule @tailwind` - This is expected, PostCSS processes these
- ✅ `Download the React DevTools` - Optional development tool
- ✅ Recharts dimension warnings on initial render - Resolves after mount
