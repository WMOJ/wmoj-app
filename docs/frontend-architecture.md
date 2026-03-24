```mermaid
flowchart TD
    %% Define Styles
    classDef serverComponent fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef clientComponent fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef context fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef guard fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef route fill:#eceff1,stroke:#546e7a,stroke-width:1px,stroke-dasharray: 5 5;

    %% --- Root Layout & Contexts ---
    subgraph RootLayout [app/layout.tsx (Server Component)]
        direction TB
        Themes[ThemeProvider]:::context
        Auth[AuthProvider<br/>Fetches session/user/profile on mount]:::context
        Timers[CountdownProvider]:::context
        
        Themes --> Auth
        Auth --> Timers
    end

    %% --- Routing Hierarchy (Server Components) ---
    subgraph Routes [Next.js App Router (Server Boundaries)]
        direction TB
        
        PublicRoute[Public / Auth Routes<br/>/auth/login, /]:::route
        UserRoute[User Domain Routes<br/>/problems, /contests, /dashboard]:::route
        ManagerRoute[Manager Routes<br/>/manager/*]:::route
        AdminRoute[Admin Routes<br/>/admin/*]:::route
    end

    Timers --> PublicRoute & UserRoute & ManagerRoute & AdminRoute

    %% --- Client Component & Guard Boundaries ---
    
    subgraph PublicBoundary [Public Boundary]
        direction TB
        PublicPage[Server Pages<br/>e.g., app/auth/login/page.tsx]:::serverComponent
        PublicClient[Client UIs<br/>LoginClient.tsx]:::clientComponent
        PublicPage --> PublicClient
    end
    PublicRoute --> PublicBoundary

    subgraph UserBoundary [User / Regular Boundary]
        direction TB
        RegGuard[RegularOnlyGuard<br/>Validates AuthContext]:::guard
        UserPage[Server Pages<br/>app/problems/page.tsx<br/>Fetches DB Data directly]:::serverComponent
        UserClient[Client UIs<br/>ProblemsClient.tsx, CodeEditor]:::clientComponent
        
        RegGuard --> UserPage
        UserPage -->|Passes props| UserClient
    end
    UserRoute --> UserBoundary

    subgraph ManagerBoundary [Manager Boundary]
        direction TB
        ManGuard[ManagerGuard<br/>Enforces 'manager' role]:::guard
        ManagerPage[Server Pages<br/>app/manager/dashboard/page.tsx]:::serverComponent
        ManagerClient[Client UIs<br/>ManagerDashboardClient.tsx]:::clientComponent
        
        ManGuard --> ManagerPage
        ManagerPage -->|Passes props| ManagerClient
    end
    ManagerRoute --> ManagerBoundary

    subgraph AdminBoundary [Admin Boundary]
        direction TB
        AdmGuard[AdminGuard<br/>Enforces 'admin' role]:::guard
        AdminPage[Server Pages<br/>app/admin/dashboard/page.tsx<br/>getServerSupabase Data Fetch]:::serverComponent
        AdminClient[Client UIs<br/>AdminDashboardClient.tsx, React State]:::clientComponent
        
        AdmGuard --> AdminPage
        AdminPage -->|Passes props| AdminClient
    end
    AdminRoute --> AdminBoundary

    %% --- Legend ---
    subgraph Legend
        direction LR
        L1[Server Component]:::serverComponent
        L2[Client Component]:::clientComponent
        L3[Context Provider]:::context
        L4[Access Guard]:::guard
    end
```