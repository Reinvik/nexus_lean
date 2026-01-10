
# Module Access Management

## Overview
A new feature has been added to allow Super Admins to control which modules (features) are accessible for each company.

## How to Use

1.  **Navigate to Companies**:
    *   Log in as a Super Admin.
    *   Go to the Administration panel.
    *   Select the "Companies" tab.

2.  **Edit Company**:
    *   Click on the "Edit" (pencil) icon for any company.
    *   In the "Nueva Empresa" or "Editar Empresa" modal, you will see a new section: **Módulos Habilitados**.

3.  **Manage Modules**:
    *   Toggle the checkboxes for the desired modules:
        *   Tarjetas 5S
        *   Auditoría 5S
        *   Proyectos A3
        *   VSM
        *   Quick Wins
        *   Consultor IA
    *   Click "Guardar".

4.  **Effects**:
    *   **Sidebar**: Users of that company will only see the enabled modules in the sidebar menu.
    *   **Dashboard**: The Dashboard widgets for disabled modules will be hidden.

## Technical Details

*   **Database**: A new column `allowed_modules` (text[]) was added to the `companies` table.
*   **Default**: Legacy companies default to having ALL modules enabled.
*   **Frontend**: The application checks `user.allowedModules` (fetched from the company settings) to determine visibility.
