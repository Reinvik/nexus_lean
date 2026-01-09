-- Drop the existing update policy
DROP POLICY IF EXISTS "profiles_update" ON "public"."profiles";

-- Create the new, corrected policy
CREATE POLICY "profiles_update" ON "public"."profiles"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
    -- Users can update their own profile
    (id = auth.uid())
    OR
    -- Superadmins and Platform Admins can update ANY profile
    (
        (auth.jwt() ->> 'app_role'::text) = ANY (ARRAY['superadmin'::text, 'platform_admin'::text])
    )
    OR
    -- Company Admins can ONLY update profiles in their own company
    (
        (auth.jwt() ->> 'app_role'::text) = 'company_admin'::text
        AND
        company_id = ((auth.jwt() ->> 'company_id'::text))::uuid
    )
)
WITH CHECK (
    -- Same logic for the new state of the row
    (id = auth.uid())
    OR
    (
        (auth.jwt() ->> 'app_role'::text) = ANY (ARRAY['superadmin'::text, 'platform_admin'::text])
    )
    OR
    (
        (auth.jwt() ->> 'app_role'::text) = 'company_admin'::text
        AND
        company_id = ((auth.jwt() ->> 'company_id'::text))::uuid
    )
);
