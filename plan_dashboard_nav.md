# Dashboard Navigation

The user wants the summary cards on the dashboard to be clickable and take them to the corresponding module pages.

## User Review Required
No major architectural changes. Just wrapping existing UI with links.

## Proposed Changes

### [Dashboard.jsx](file:///c:/Proyectos/nexus-be-lean/src/pages/Dashboard.jsx)
- Import `Link` from `react-router-dom`.
- Wrap the 4 top `StatCard` components in `Link` components:
    - **Tarjetas 5S** -> `/5s`
    - **Quick Wins** -> `/quick-wins`
    - **Mapas VSM** -> `/vsm`
    - **Impacto Alto (A3)** -> `/a3`
- Add `hover:scale-105 transition-transform` or similar classes to the `Link` to indicate interactivity.

### Optional: Content Cards
- The user specifically mentioned "pinchar los iconos" (clicking the icons/cards). The screenshot focused on the top cards. I will only link the top StatCards for now as they are the main entry points.

## Verification Plan
### Manual Verification
- Click on "Tarjetas 5S" card -> Should go to `/5s`.
- Click on "Quick Wins" card -> Should go to `/quick-wins`.
- Click on "Mapas VSM" card -> Should go to `/vsm`.
- Click on "Impacto Alto" card -> Should go to `/a3`.
