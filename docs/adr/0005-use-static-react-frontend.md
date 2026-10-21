# Use React, Vite, and TanStack Router for the desktop frontend

Lumina uses React with Vite and TanStack Router, replacing the exploratory TanStack Start and Nitro scaffold. Its desktop workflow needs static frontend assets and Tauri commands rather than server rendering or server functions. This keeps frontend development focused on the packaged desktop application; adding a hosted server workflow would require a separate design decision.
