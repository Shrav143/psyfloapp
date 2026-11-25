# Library Documentation (`src/lib/`)

This document provides architecture overview and guidance for shared libraries in the FeelWell frontend.

## Overview

The `src/lib/` directory contains reusable utilities, components, services, and the AI conversation engine. Code here is shared across multiple pages and features.

## Directory Structure

```text
src/lib/
├── [utility files]          # Root-level utilities
├── core-ui/                 # shadcn/ui base components (28+ components)
├── extended-ui/             # Custom/extended components
│   └── ai/                  # AI chat UI components
├── langgraph/               # AI conversation engine (separate docs)
├── database/                # Drizzle ORM + Supabase clients
├── api/                     # HTTP clients and OpenAPI types
├── chat/                    # Chat session management
├── alerts/                  # Alert components and actions
├── student-alerts/          # Student-grouped alert system
├── auth/                    # Authentication utilities
├── screener/                # Wellness assessment system
├── check-in/                # Daily mood check-in
├── emotion/                 # Mood/emotion components
├── email-filtering/         # Email notification settings
├── access-control/          # Role-based access control
├── analytics/               # Analytics components
├── change-password/         # Password change flow
├── dashboard/               # Dashboard utilities
├── emergency-resources/     # Crisis resources
├── loading/                 # Loading state components
├── privacy-policy/          # Privacy policy content
├── terms-and-conditions/    # Terms content
├── quotes/                  # Affirmations/quotes
├── school/                  # School management
├── table/                   # Table utilities
└── user/                    # User utilities
```

## Module Categories

### Core Infrastructure

#### Database (`database/`)

Database connection and ORM utilities.

| File | Purpose |
|------|---------|
| `drizzle.ts` | Drizzle ORM client with RLS support |
| `supabase.ts` | Supabase server client creation |

**Usage:**
```typescript
import { serverDrizzle } from "@/lib/database/drizzle";

const db = await serverDrizzle();
const userId = db.userId(); // Get authenticated user ID

// With Row-Level Security
const result = await db.rls(async (tx) => {
  return tx.select().from(users).where(eq(users.id, userId));
});

// Admin access (bypasses RLS)
await db.admin.insert(alerts).values({ ... });
```

#### API Clients (`api/`)

HTTP clients for external services.

| File | Purpose |
|------|---------|
| `client.core.ts` | Core API client (backend) |
| `client.chat.ts` | Chat API client with Google Auth |
| `openapi.core.ts` | Generated OpenAPI types for core |
| `openapi.chat.ts` | Generated OpenAPI types for chat |

#### Authentication (`auth/`)

Authentication utilities.

| File | Purpose |
|------|---------|
| `signup-cookie.ts` | OTP cookie management for signup flow |

### AI System

#### LangGraph (`langgraph/`)

The AI conversation engine. **See `lib/langgraph-docs.md` for detailed documentation.**

Key responsibilities:
- Conversation orchestration via StateGraph
- Risk detection and assessment
- CSSR screening protocol
- Alert creation and management
- Conversation persistence with checkpoints

#### Chat (`chat/`)

Chat session management and UI.

| File | Purpose |
|------|---------|
| `api.ts` | Server functions for chat sessions |
| `types.ts` | Chat type definitions |
| `index.ts` | Public exports |
| `ai-chat.tsx` | Main AI chat component |
| `chat-session-item.tsx` | Session list item |
| `chat-sessions-sidebar.tsx` | Session sidebar |

### UI Components

#### Core UI (`core-ui/`)

Base shadcn/ui components built on Radix UI primitives.

**Categories:**
- **Form inputs:** `button`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `slider`
- **Overlays:** `dialog`, `alert-dialog`, `sheet`, `popover`, `dropdown-menu`, `tooltip`
- **Layout:** `card`, `tabs`, `collapsible`, `separator`, `scroll-area`
- **Data display:** `table`, `badge`, `avatar`, `progress`, `timeline`
- **Navigation:** `sidebar`, `breadcrumb`, `pagination`
- **Feedback:** `alert`, `sonner` (toasts)
- **Calendar:** `calendar`, `grid-calendar`
- **Charts:** `chart` (Recharts wrapper)
- **Typography:** `typography`

**Usage:**
```typescript
import { Button } from "@/lib/core-ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/lib/core-ui/card";
import { Dialog, DialogTrigger, DialogContent } from "@/lib/core-ui/dialog";
```

#### Extended UI (`extended-ui/`)

Custom components extending core UI.

| File | Purpose |
|------|---------|
| `page.tsx` | Page wrapper with consistent styling |
| `timestamp.tsx` | Relative timestamp display |
| `input.tsx` | Enhanced input component |
| `empty.tsx` | Empty state component |
| `form.tsx` | Form utilities |
| `error.tsx` | Error display component |

**AI Components (`ai/`):**
| File | Purpose |
|------|---------|
| `conversation.tsx` | Full chat conversation display |
| `message.tsx` | Individual chat message |
| `response.tsx` | AI response wrapper |
| `input.tsx` | Chat input field |
| `tool.tsx` | Tool call display |
| `source.tsx` | Source citation |
| `suggestion.tsx` | Suggested responses |
| `reasoning.tsx` | AI reasoning display |
| `branch.tsx` | Conversation branching |

### Domain Features

#### Prior-authorization demo (`demo/`, `demo-ui/`)

Deterministic mock dataset and derivations behind the `/demo` routes (payers, patients, authorization ledger, visits, eligibility run, denials, appeals, agents, analytics) plus the shared demo presentational pieces. No database or auth imports. Architecture: `docs/frontend/lib/demo-docs.md`; per-file docs under `docs/frontend/lib/demo/` and `docs/frontend/lib/demo-ui/`.

#### Alerts (`alerts/`)

Alert management for counselors.

| File | Purpose |
|------|---------|
| `actions.ts` | Server actions for alerts |
| `schema.ts` | Validation schemas |
| `alert-card.tsx` | Alert display card |
| `alert-card-actions.tsx` | Alert action buttons |
| `add-note-button.tsx` | Note addition UI |
| `service/create.ts` | Alert creation service |

#### Student Alerts (`student-alerts/`)

Student-grouped alert system. See `src/lib/student-alerts/README.md`.

#### Screener (`screener/`)

Wellness assessment system.

| File | Purpose |
|------|---------|
| `data.ts` | Screener questions and config |
| `type.ts` | Type definitions |
| `utils.ts` | Utility functions |
| `sel-skills.ts` | Social-emotional learning skills |
| `service/create.ts` | Response creation |
| `service/completion.ts` | Completion handling |

#### Check-In (`check-in/`)

Daily mood check-in feature.

| File | Purpose |
|------|---------|
| `utils.ts` | Client utilities |
| `server-utils.ts` | Server utilities |
| `streak.ts` | Streak tracking logic |

#### Emotion (`emotion/`)

Mood and emotion display.

| File | Purpose |
|------|---------|
| `mood.tsx` | Mood selection component |
| `display.tsx` | Emotion display |
| `moods/*.tsx` | Individual emotion SVG icons |

### Utilities

#### Root-Level Files

| File | Purpose |
|------|---------|
| `app.ts` | App configuration constants |
| `errors.ts` | Error handling utilities |
| `string-utils.ts` | String manipulation |
| `array-utils.ts` | Array utilities |
| `number-utils.ts` | Number formatting |
| `tailwind-utils.ts` | Tailwind CSS utilities (cn function) |
| `time-utils.ts` | Client-side time formatting |
| `time-server-utils.ts` | Server-side time formatting |
| `coming-soon.tsx` | Placeholder component |
| `data-revalidator.tsx` | Cache revalidation component |

## Key Patterns

### Server-Only Modules

Files starting with `"server-only"` can only be imported in server components:

```typescript
"server-only";

import { serverDrizzle } from "@/lib/database/drizzle";
// This file can only run on the server
```

### Path Aliases

Use `@/lib/` for imports:

```typescript
import { db } from "@/lib/database/drizzle";
import { Button } from "@/lib/core-ui/button";
import { cn } from "@/lib/tailwind-utils";
```

### Service Functions

Services expose async functions for database operations:

```typescript
// lib/alerts/service/create.ts
export async function createAlert(data: CreateAlertInput): Promise<Alert> {
  const db = await serverDrizzle();
  // Insert and return
}
```

### Component Organization

Components follow a consistent structure:

```typescript
// 1. Imports
import { cn } from "@/lib/tailwind-utils";

// 2. Types
interface Props {
  title: string;
  variant?: "default" | "destructive";
}

// 3. Component
export function AlertCard({ title, variant = "default" }: Props) {
  return (
    <div className={cn("rounded-lg", variant === "destructive" && "bg-red-50")}>
      {title}
    </div>
  );
}
```

## Common Tasks

### Adding a New Lib Module

1. Create folder: `src/lib/<module>/`
2. Create `index.ts` for public exports
3. Add feature-specific files
4. Create documentation: `docs/frontend/lib/<module>-docs.md` (if complex) or individual file docs
5. Update this file if adding a new category

### Creating a New UI Component

1. For base components: Add to `core-ui/`
2. For custom components: Add to `extended-ui/`
3. Follow shadcn/ui patterns (forwardRef, className prop, variants)
4. Export from appropriate index file

### Adding Server Functions

1. Create function in appropriate service file
2. Mark file with `"server-only"` if needed
3. Use `serverDrizzle()` for database access
4. Handle errors appropriately
5. Return typed results

## Dependencies

Key dependencies used across lib modules:

| Package | Purpose |
|---------|---------|
| `drizzle-orm` | Database ORM |
| `@supabase/ssr` | Supabase client |
| `@langchain/*` | LangGraph AI framework |
| `@radix-ui/*` | Headless UI primitives |
| `zod` | Schema validation |
| `date-fns` | Date formatting |
| `recharts` | Charts |

## See Also

- **`./app-docs.md`** - App Router documentation
- **`./lib/langgraph-docs.md`** - AI conversation engine (detailed)
- **`../../apps/frontend/CLAUDE.md`** - Development rules
- **`../../packages/database/src/schema/`** - Database schema definitions
