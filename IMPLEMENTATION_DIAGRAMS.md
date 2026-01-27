# QMS Implementation Diagrams - Role Distribution Plan

## Diagram 1: Role Hierarchy and Capabilities Distribution

```mermaid
flowchart TD
    A[User Types] --> B[Admin]
    A --> C[Counter Staff]
    A --> D[Public]
    
    B --> B1[Full System Access]
    B --> B2[User Management]
    B --> B3[Multi-Counter Oversight]
    B --> B4[System Analytics]
    B --> B5[Ticket Management All]
    B --> B6[Counter Monitoring]
    
    C --> C1[Single Counter Access]
    C --> C2[Personal Analytics]
    C --> C3[Ticket Operations]
    C --> C4[Service Information]
    C --> C5[Performance Metrics]
    C --> C6[Enhanced History]
    
    D --> D1[View Display Only]
    D --> D2[Create Tickets]
    
    style B fill:#2d5016
    style C fill:#4a7c59
    style D fill:#6b9b7a
```

## Diagram 2: Admin Dashboard Structure

```mermaid
flowchart LR
    A[Admin Dashboard] --> B[Services Tab]
    A --> C[Counters Tab]
    A --> D[Tickets Tab NEW]
    A --> E[Analytics Tab ENHANCED]
    A --> F[Counter Monitoring Tab NEW]
    A --> G[Users Tab COMPLETE]
    
    B --> B1[CRUD Operations]
    B --> B2[Service Management]
    
    C --> C1[Counter CRUD]
    C --> C2[Counter Assignment]
    
    D --> D1[View All Tickets]
    D --> D2[Filter & Search]
    D --> D3[Override Operations]
    D --> D4[Export Data]
    
    E --> E1[System Stats]
    E --> E2[Per-Counter Metrics]
    E --> E3[Service Analytics]
    E --> E4[Staff Performance]
    E --> E5[Charts & Trends]
    
    F --> F1[Real-time Status]
    F --> F2[Staff Assignments]
    F --> F3[Quick Actions]
    F --> F4[Performance Indicators]
    
    G --> G1[Create Users]
    G --> G2[Edit Profiles]
    G --> G3[Assign Counters]
    G --> G4[View Activity]
    G --> G5[Deactivate Users]
    
    style D fill:#ffd700
    style E fill:#ffd700
    style F fill:#ffd700
    style G fill:#ffd700
```

## Diagram 3: Counter Staff Dashboard Structure

```mermaid
flowchart TD
    A[Counter Staff Dashboard] --> B[Performance Stats NEW]
    A --> C[Service Information NEW]
    A --> D[Next Ticket]
    A --> E[Current Ticket Actions]
    A --> F[Enhanced History]
    
    B --> B1[Tickets Served Today]
    B --> B2[Average Service Time]
    B --> B3[Current Wait Time]
    B --> B4[Service Completion Rate]
    B --> B5[Visual Indicators]
    
    C --> C1[Service Name]
    C --> C2[Service Description]
    C --> C3[Queue Statistics]
    C --> C4[Expected Wait Times]
    
    D --> D1[Display Next Ticket]
    D --> D2[Call Next Button]
    
    E --> E1[Serve]
    E --> E2[Recall]
    E --> E3[Skip]
    E --> E4[Transfer]
    
    F --> F1[Filter by Date]
    F --> F2[Search Functionality]
    F --> F3[Export History]
    F --> F4[Service Time Calc]
    F --> F5[Performance Trends]
    
    style B fill:#90ee90
    style C fill:#90ee90
    style F fill:#90ee90
```

## Diagram 4: Data Flow and Permissions

```mermaid
flowchart TB
    subgraph auth[Authentication Layer]
        U[User Login]
        UP[User Profile]
        R{Role Check}
    end
    
    subgraph admin[Admin Access]
        A1[All Services]
        A2[All Counters]
        A3[All Tickets]
        A4[All Users]
        A5[All Analytics]
    end
    
    subgraph counter[Counter Staff Access]
        C1[Assigned Counter Only]
        C2[Counter Tickets Only]
        C3[Personal Stats]
        C4[Service Info Read]
    end
    
    subgraph db[(Database)]
        DB1[RLS Policies]
        DB2[Row Level Security]
    end
    
    U --> UP
    UP --> R
    R -->|admin| admin
    R -->|counter_staff| counter
    R -->|public| P[Public Display]
    
    admin --> DB1
    counter --> DB1
    DB1 --> DB2
    DB2 -->|Enforces| admin
    DB2 -->|Enforces| counter
    
    style admin fill:#2d5016
    style counter fill:#4a7c59
    style db fill:#6b9b7a
```

## Diagram 5: Feature Distribution Matrix

```mermaid
graph LR
    subgraph features[Supervisor Features to Distribute]
        F1[Multi-Counter Management]
        F2[Staff Oversight]
        F3[Analytics & Reporting]
        F4[Ticket Override]
        F5[Performance Monitoring]
        F6[Real-time Status]
    end
    
    subgraph admin[Goes to Admin]
        A1[Multi-Counter Management]
        A2[Staff Oversight]
        A3[System Analytics]
        A4[Ticket Override All]
        A5[Performance Monitoring All]
        A6[Real-time Status All]
    end
    
    subgraph counter[Goes to Counter Staff]
        C1[Personal Analytics]
        C2[Counter Performance]
        C3[Service Information]
        C4[Enhanced History]
        C5[Personal Metrics]
    end
    
    F1 --> A1
    F2 --> A2
    F3 --> A3
    F4 --> A4
    F5 --> A5
    F6 --> A6
    
    F3 --> C1
    F5 --> C2
    F1 --> C3
    F6 --> C4
    F5 --> C5
    
    style admin fill:#2d5016
    style counter fill:#4a7c59
```

## Diagram 6: Admin User Management Flow

```mermaid
sequenceDiagram
    participant Admin
    participant AdminUI
    participant Supabase
    participant Database
    participant CounterStaff
    
    Admin->>AdminUI: Navigate to Users Tab
    AdminUI->>Supabase: Fetch all users
    Supabase->>Database: Query user_profiles
    Database-->>Supabase: Return users
    Supabase-->>AdminUI: Display users list
    
    Admin->>AdminUI: Create Counter Staff
    AdminUI->>Supabase: Create auth user
    Supabase->>Database: Insert auth.users
    Database-->>Supabase: User created
    
    AdminUI->>Supabase: Create user_profile
    Supabase->>Database: Insert user_profiles
    Database-->>Supabase: Profile created
    
    Admin->>AdminUI: Assign Counter
    AdminUI->>Supabase: Update counter_id
    Supabase->>Database: Update user_profiles
    Database-->>Supabase: Updated
    
    Supabase-->>CounterStaff: Real-time update
    CounterStaff->>CounterStaff: Dashboard refreshes
```

## Diagram 7: Counter Staff Analytics Flow

```mermaid
flowchart TD
    A[Counter Staff Login] --> B[Load Dashboard]
    B --> C[Fetch Assigned Counter]
    C --> D[Fetch Tickets for Counter]
    D --> E[Calculate Statistics]
    
    E --> F[Performance Stats Card]
    E --> G[Service Information]
    E --> H[Ticket History]
    
    F --> F1[Tickets Served Today]
    F --> F2[Avg Service Time]
    F --> F3[Wait Time]
    F --> F4[Completion Rate]
    
    G --> G1[Service Details]
    G --> G2[Queue Stats]
    G --> G3[Wait Estimates]
    
    H --> H1[Filtered History]
    H --> H2[Performance Trends]
    H --> H3[Export Option]
    
    I[Real-time Updates] --> D
    I --> E
    
    style F fill:#90ee90
    style G fill:#90ee90
    style H fill:#90ee90
```

## Diagram 8: Database RLS Policy Structure

```mermaid
flowchart TB
    subgraph tables[Database Tables]
        T1[services]
        T2[counters]
        T3[tickets]
        T4[user_profiles]
        T5[audit_logs]
    end
    
    subgraph admin_policies[Admin Policies]
        AP1[Full Access Services]
        AP2[Full Access Counters]
        AP3[Full Access Tickets]
        AP4[Full Access Users]
        AP5[Full Access Audit]
    end
    
    subgraph counter_policies[Counter Staff Policies]
        CP1[Read Services]
        CP2[Read Assigned Counter]
        CP3[Update Assigned Counter Tickets]
        CP4[Read Own Profile]
    end
    
    subgraph public_policies[Public Policies]
        PP1[Read Services]
        PP2[Read Counters]
        PP3[Read Tickets]
    end
    
    T1 --> AP1
    T1 --> CP1
    T1 --> PP1
    
    T2 --> AP2
    T2 --> CP2
    T2 --> PP2
    
    T3 --> AP3
    T3 --> CP3
    T3 --> PP3
    
    T4 --> AP4
    T4 --> CP4
    
    T5 --> AP5
    
    style admin_policies fill:#2d5016
    style counter_policies fill:#4a7c59
    style public_policies fill:#6b9b7a
```

## Summary

These diagrams show:
1. **Role Distribution**: How supervisor capabilities are split between Admin and Counter Staff
2. **Dashboard Structure**: What each role sees and can do
3. **Data Flow**: How permissions and RLS policies work
4. **Feature Matrix**: Which features go to which role
5. **Process Flows**: How key operations work
6. **Security**: Database-level access control

The key principle: **Admin gets oversight capabilities, Counter Staff gets personal performance tools**.

