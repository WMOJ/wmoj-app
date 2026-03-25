# Role-Based Access Control (RBAC) Flow

## Authentication & Guard Flowchart

The following flowchart illustrates how varying user levels authenticate, how roles are fetched, and how the `*Guard` components route traffic across the application.

```mermaid
flowchart TD
    %% Styles
    classDef Auth fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef Guard fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef Page fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef Reject fill:#ffebee,stroke:#c62828,stroke-width:2px;

    %% Entry Point
    Req([User Request]) --> RouteCheck[Requested Route]
    
    %% Layer 1: Authentication
    RouteCheck --> AuthGuard{"AuthGuard\n(Validates Session)"}:::Guard
    
    AuthGuard -- "Unauthenticated" --> Login["Redirect: /auth/login"]:::Reject
    AuthGuard -- "Authenticated" --> Context["AuthContext\n(Resolves Role)"]:::Auth
    
    %% Layer 2: Role Context
    Context --> Role{"Role Evaluated?"}
    Role -- "Loading" --> Spinner["Show Spinner"]
    Role -- "Resolved" --> Routing
    
    %% Layer 3: Path Evaluation
    Routing{"Target Path?"}
    
    %% Admin Path
    Routing -- "/admin/*" --> AdminGuard{"AdminGuard\n(Requires 'admin')"}:::Guard
    AdminGuard -- "Yes" --> AdminUI["Render Admin UI"]:::Page
    AdminGuard -- "Unknown" --> APIAdmin["Verify via API"]:::Auth
    AdminGuard -- "No" --> KickAdmin["Redirect: /dashboard"]:::Reject
    APIAdmin -- "OK" --> AdminUI
    APIAdmin -- "Fail" --> KickAdmin

    %% Manager Path
    Routing -- "/manager/*" --> ManagerGuard{"ManagerGuard\n(Requires 'manager')"}:::Guard
    ManagerGuard -- "Yes" --> ManagerUI["Render Manager UI"]:::Page
    ManagerGuard -- "Unknown" --> APIManager["Verify via API"]:::Auth
    ManagerGuard -- "No" --> KickManager["Redirect: /dashboard"]:::Reject
    APIManager -- "OK" --> ManagerUI
    APIManager -- "Fail" --> KickManager

    %% Regular Path
    Routing -- "/problems, /contests, etc." --> RegGuard{"RegularOnlyGuard\n(No Role Restriction)"}:::Guard
    RegGuard -- "Workspace Ready" --> RegUI["Render Standard UI\n(Admins, Managers, Users allowed)"]:::Page
```