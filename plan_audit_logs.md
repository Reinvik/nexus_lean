# Create Generic Audit Logs Table

The `AuditService.js` relies on a generic `audit_logs` table which is missing from the database schema. This causes errors whenever an action (like creating a 5S card) attempts to log itself.

## User Review Required
None. This is a fix for a missing dependency.

## Proposed Changes

### Database Schema
#### [NEW] `audit_logs` Table
Create a new table `public.audit_logs` with the following columns:
- `id` (uuid, primary key, default gen_random_uuid())
- `created_at` (timestamp with time zone, default now())
- `action` (text) - e.g., 'CREATE', 'UPDATE', 'DELETE'
- `entity_type` (text) - e.g., '5S_CARD', 'A3'
- `entity_id` (text) - ID of the entity
- `details` (jsonb) - For storing extra context
- `user_id` (uuid) - Reference to auth.users (optional)
- `user_email` (text) - Fallback for display

Enable RLS on this table to allow:
- **Insert**: Authenticated users can insert logs.
- **Select**: Authenticated users can view logs (for history features).

## Verification Plan

### Automated Tests
- Run `echo "\d audit_logs" | docker exec ...` to verify table creation.

### Manual Verification
- Ask user to create a 5S card or A3 project.
- Verify no console errors appear regarding `audit_logs`.
- Verify the action is logged (optional, but assumed if no error).
