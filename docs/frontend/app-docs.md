# App Router Documentation (`src/app/`)

This document provides architecture overview and guidance for the Next.js App Router structure in the FeelWell frontend.

## Overview

The `src/app/` directory contains all pages, layouts, and API routes using Next.js 15 App Router conventions. The application serves three main user roles: **Students**, **Counselors**, and **Admins**.

## Directory Structure

```text
src/app/
├── layout.tsx              # Root layout (providers, fonts, metadata)
├── globals.css             # Global Tailwind CSS styles
├── page.tsx                # Landing page
├── (auth)/                 # Authentication routes (grouped, no URL segment)
├── dashboard/
│   ├── student/            # Student dashboard and features
│   └── counselor/           # Counselor dashboard and features
├── admin/                  # Admin tools (evals, prompt testing, schools)
├── demo/                   # Psyflo prior-authorization clickable demo (mock data; see app/demo-docs.md)
├── onboarding/
│   └── student/            # Student profile setup wizard
├── api/                    # API routes
├── privacy-policy/         # Public privacy policy page
├── terms-and-conditions/   # Public terms page
└── ~lib/                   # App-level shared utilities
```

## Key Patterns

### 1. Server vs Client Components

**Server Components (default):**
- `page.tsx` files are server components by default
- Fetch data directly, render HTML on server
- Cannot use hooks, event handlers, or browser APIs

**Client Components:**
- Add `"use client"` directive at top of file
- Used for interactivity, state, effects
- Placed in `~lib/` folders colocated with pages

```tsx
// page.tsx - Server Component
export default async function Page() {
  const data = await fetchData(); // Server-side fetch
  return <ClientComponent initialData={data} />;
}

// ~lib/client-component.tsx - Client Component
"use client";
export function ClientComponent({ initialData }) {
  const [state, setState] = useState(initialData);
  // Interactive logic
}
```

### 2. Colocated `~lib/` Convention

Page-specific components live in `~lib/` folders next to their page:

```text
dashboard/student/home/
├── page.tsx                    # Server component (minimal logic)
└── ~lib/
    ├── dashboard-client.tsx    # Main client component with state
    ├── chat-history-sidebar.tsx
    ├── main-chat-area.tsx
    └── hitlist/                # Feature-specific subfolder
        ├── card.tsx
        └── check-in.tsx
```

**Rules:**
- `~lib/` folders are for page-specific code only
- Shared code goes in `src/lib/`
- Name files descriptively for their purpose

### 3. Route Groups

Route groups use parentheses `()` to organize routes without affecting the URL:

```text
(auth)/
├── login/page.tsx      # URL: /login
├── sign-up/page.tsx    # URL: /sign-up
├── sign-out/route.ts   # URL: /sign-out
└── welcome/            # URL: /welcome/*
    ├── page.tsx
    └── customize/page.tsx
```

### 4. Dynamic Routes

Dynamic segments use brackets `[]`:

```text
dashboard/counselor/alerts/[alertId]/page.tsx    # URL: /dashboard/counselor/alerts/123
dashboard/student/chat/[sessionId]/page.tsx     # URL: /dashboard/student/chat/abc
```

### 5. API Routes

API routes use `route.ts` files with HTTP method exports:

```typescript
// api/chat/route.ts
export async function POST(request: Request) {
  // Handle POST request
}

export async function GET(request: Request) {
  // Handle GET request
}
```

## Route Categories

### Authentication Routes (`(auth)/`)

| Route | Purpose |
|-------|---------|
| `/login` | Student/counselor login with OTP |
| `/sign-up` | New user registration |
| `/sign-out` | Logout endpoint |
| `/check-in` | Daily mood check-in (pre-auth) |
| `/welcome/*` | Welcome wizard for new users |

### Student Dashboard (`dashboard/student/`)

| Route | Purpose |
|-------|---------|
| `/dashboard/student/home` | Main dashboard with chat, hitlist, journey |
| `/dashboard/student/chat/[sessionId]` | Individual chat session |
| `/dashboard/student/check-in` | Daily mood check-in |
| `/dashboard/student/wellness-check` | Wellness screener assessment |
| `/dashboard/student/discover` | Discover resources |
| `/dashboard/student/quests` | Wellness quests/challenges |
| `/dashboard/student/toolbox` | Coping tools and resources |
| `/dashboard/student/settings` | Account settings |
| `/dashboard/student/more` | Additional resources and policies |

### Counselor Dashboard (`dashboard/counselor/`)

| Route | Purpose |
|-------|---------|
| `/dashboard/counselor/home` | Overview with stats and charts |
| `/dashboard/counselor/alerts` | Alert management list |
| `/dashboard/counselor/alerts/[alertId]` | Individual alert details |
| `/dashboard/counselor/alerts/student/[studentId]` | Student-grouped alerts |
| `/dashboard/counselor/students` | Student list |
| `/dashboard/counselor/students/[studentId]` | Individual student profile |
| `/dashboard/counselor/analytics` | School-wide analytics |
| `/dashboard/counselor/inbox` | Messages/notifications |
| `/dashboard/counselor/resources` | Educational resources |
| `/dashboard/counselor/settings` | Account and school settings |

### Admin Routes (`admin/`)

| Route | Purpose |
|-------|---------|
| `/admin` | Admin dashboard home |
| `/admin/agents` | Agent testing interface |
| `/admin/agents/[sessionId]` | Agent chat with execution trace |
| `/admin/evals` | Evaluation management |
| `/admin/schools` | School management |

### API Routes (`api/`)

| Route | Purpose |
|-------|---------|
| `/api/auth/logout` | Logout handler |
| `/api/chat` | Main chat endpoint (POST) |
| `/api/chat/stream` | Streaming chat endpoint |
| `/api/chat/sessions` | Chat session CRUD |
| `/api/chat/sessions/[sessionId]` | Individual session operations |
| `/api/chat/trace/[sessionId]` | Execution trace retrieval |

## Common Tasks

### Adding a New Page

1. Create folder: `src/app/<route>/`
2. Create `page.tsx` (server component for data fetching)
3. Create `~lib/` folder with client components if needed
4. Add loading/error states if needed (`loading.tsx`, `error.tsx`)
5. Update this documentation if adding new route category

### Adding a New API Route

1. Create `src/app/api/<path>/route.ts`
2. Export HTTP method handlers (`GET`, `POST`, `PUT`, `DELETE`)
3. Use `serverDrizzle()` for database access with RLS
4. Return appropriate responses with status codes

### Creating Protected Routes

All dashboard routes are protected by middleware. The protection flow:

1. Middleware checks Supabase session
2. Unauthenticated users redirected to `/login`
3. User role determines allowed routes (student vs counselor)
4. Counselors redirected away from student routes and vice versa

### Server Actions

Server actions are defined in `action.ts` files colocated with pages:

```typescript
// dashboard/student/check-in/~lib/action.ts
"use server";

export async function submitCheckIn(formData: FormData) {
  const db = await serverDrizzle();
  // Validate and process
  revalidatePath("/dashboard/student");
}
```

## Layout Hierarchy

```text
layout.tsx (root)
├── (auth)/layout.tsx (auth pages styling)
├── dashboard/layout.tsx (dashboard shell)
│   ├── student/layout.tsx (student sidebar)
│   └── counselor/layout.tsx (counselor sidebar)
├── admin/layout.tsx (admin sidebar)
└── onboarding/student/layout.tsx (wizard layout)
```

## File Naming Conventions

| Pattern | Purpose |
|---------|---------|
| `page.tsx` | Page component (required) |
| `layout.tsx` | Shared layout wrapper |
| `loading.tsx` | Loading UI (Suspense fallback) |
| `error.tsx` | Error boundary UI |
| `route.ts` | API route handlers |
| `action.ts` | Server actions |
| `schema.ts` | Zod validation schemas |

## See Also

- **`../lib-docs.md`** - Shared library documentation
- **`../lib/langgraph-docs.md`** - AI conversation engine
- **`../../apps/frontend/CLAUDE.md`** - Development rules and commands
