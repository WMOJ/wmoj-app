# Role-Based Access Control (RBAC) Flow

## Authentication & Guard Flowchart

The following flowchart illustrates how varying user levels authenticate, how roles are fetched, and how the `*Guard` components route traffic across the application.

```mermaid
flowchart TD
    %% Define Styles
    classDef Auth fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef Guard fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef Page fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef Action fill:#ffebee,stroke:#c62828,stroke-width:2px;

    User([User]) --> AuthCheck{AuthContext initialized?}

    %% Auth Flow
    AuthCheck -- No --> Loading[Show Loader]
    AuthCheck -- Yes --> LoggedIn{Is Signed In?}
    
    LoggedIn -- No --> PublicPages[Public Pages<br/>/auth/login, /problems, /contests]:::Page
    LoggedIn -- Yes --> FetchRole[Fetch Profile & Role<br/>query users, admins, managers table]:::Auth
    
    FetchRole --> RoleDerived{Role Evaluated?}
    
    RoleDerived -->|Role: regular| DashRegular
    RoleDerived -->|Role: admin| DashAdmin
    RoleDerived -->|Role: manager| DashManager
    
    DashRegular[userRole = 'regular']:::Auth
    DashAdmin[userRole = 'admin']:::Auth
    DashManager[userRole = 'manager']:::Auth
    
    %% Guard Logic
    DashRegular -.-> RegularGuard
    DashAdmin -.-> AdminGuard
    DashManager -.-> ManagerGuard
    
    %% Admin Guard
    subgraph AdminGuardComponent [AdminGuard.tsx]
        AdminGuard{Is userRole === 'admin' ?}:::Guard
        AdminGuard -- Yes --> AdminRoutes[Render Admin Pages<br/>/admin/*]:::Page
        AdminGuard -- No (e.g. regular) --> RedirectAdmin[Redirect to /dashboard]:::Action
        AdminGuard -- Unknown --> ApiAdminCheck[Fallback: GET /api/admin/check]:::Auth
        ApiAdminCheck -- 200 OK --> AdminRoutes
        ApiAdminCheck -- 403 Forbidden --> RedirectAdmin
    end

    %% Manager Guard
    subgraph ManagerGuardComponent [ManagerGuard.tsx]
        ManagerGuard{Is userRole === 'manager' ?}:::Guard
        ManagerGuard -- Yes --> ManagerRoutes[Render Manager Pages<br/>/manager/*]:::Page
        ManagerGuard -- No (e.g. regular, admin) --> RedirectManager[Redirect to /dashboard]:::Action
        ManagerGuard -- Unknown --> ApiManagerCheck[Fallback: GET /api/manager/check]:::Auth
        ApiManagerCheck -- 200 OK --> ManagerRoutes
        ApiManagerCheck -- 403 Forbidden --> RedirectManager
    end

    %% Regular Only Guard
    subgraph RegularGuardComponent [RegularOnlyGuard.tsx]
        RegularGuard{Loading or No Role?}:::Guard
        RegularGuard -- Yes --> WaitLoad[Show Workspace Prep Loader]:::Action
        RegularGuard -- No --> AuthRoutes[Render Standard Pages<br/>/dashboard, user submission views]:::Page
    end
```

## Permissions Matrix

This matrix formalizes what each user role is permitted to do across the application. Handled implicitly via UI layout masking and explicitly via API/Guard validation.

| Feature / Action | Guest (Unauthenticated) | Regular User | Manager | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **View Public Problems List** | ✅ | ✅ | ✅ | ✅ |
| **View Public Contests List** | ✅ | ✅ | ✅ | ✅ |
| **Authenticate (Login/Sign Up)** | ✅ | ❌ (Redirected) | ❌ (Redirected) | ❌ (Redirected) |
| **Submit Code (`/api/problems/:id/submit`)** | ❌ (AuthPrompt) | ✅ | ✅ | ✅ |
| **Join Active Contests** | ❌ | ✅ | ✅ | ✅ |
| **View User Dashboard** | ❌ | ✅ | ✅ | ✅ |
| **View Manager Dashboard** | ❌ | ❌ | ✅ | ❌ |
| **Create/Manage Specific Contests** | ❌ | ❌ | ✅ | ✅ (All Contests) |
| **Create/Manage Specific Problems** | ❌ | ❌ | ✅ | ✅ (All Problems) |
| **View ALL User Submissions** | ❌ | ❌ | ✅ (Limited to scoped users) | ✅ (Unrestricted) |
| **Use C++ Test Generator** | ❌ | ❌ | ✅ | ✅ |
| **Generate/Access System Audits** | ❌ | ❌ | ❌ | ✅ |