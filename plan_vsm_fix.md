# Fix VSM Schema

The `vsm_projects` table is missing the `takt_time` column, which prevents users from saving VSM projects that include this metric.

## User Review Required
None. This is a fix for a missing schema element.

## Proposed Changes

### Database Schema
#### [MODIFY] `vsm_projects` Table
- Add `takt_time` column of type `TEXT` (to match other metric columns like `lead_time`).

## Verification Plan

### Automated Tests
- Run `echo "\d vsm_projects" | docker exec ...` to verify column existence.

### Manual Verification
- Ask user to save a VSM project with Takt Time.
- Verify no errors occur.
