<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: עצמאי (Atzma'i)

Israeli self-employed business management system. Hebrew RTL, Supabase backend, Next.js static export.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, static export `output: "export"`) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 (`oklch()` colors — DO NOT use in PDF/print contexts) |
| Icons | Lucide React |
| Charts | Chart.js + react-chartjs-2 |
| PDF | html2pdf.js |
| DB/Auth/Storage | Supabase (`@supabase/ssr` + `@supabase/supabase-js`) |
| AI/OCR | Supabase Edge Function → OpenRouter → Gemini 2.5 Flash Lite |
| Email | Resend API (via edge function `send-report`) |
| Node | v20 (`.nvmrc`) |
| Package Manager | npm |

## Architecture

### Route Structure
```
src/app/
├── (auth)/login/page.tsx
├── (auth)/register/page.tsx
├── (dashboard)/layout.tsx    ← AuthGuard + Sidebar + ToastProvider
├── (dashboard)/page.tsx       ← Dashboard
├── (dashboard)/todos/page.tsx
├── (dashboard)/calendar/page.tsx
├── (dashboard)/projects/page.tsx
├── (dashboard)/projects/detail/page.tsx  ← ?project=xxx
├── (dashboard)/finance/page.tsx
├── (dashboard)/documents/page.tsx
├── (dashboard)/preferences/page.tsx
└── layout.tsx                 ← RootLayout: RTL, Heebo font, AuthProvider
```

All dashboard routes are thin wrappers that render a component from `src/components/`.

### Auth Flow
- `AuthProvider` — React context, creates Supabase client, manages session
- `AuthGuard` — wraps dashboard layout, redirects to `/login/` if unauthenticated
- Login uses `supabase.auth.signInWithPassword()`
- Tests use `storageState` saved from auth setup

### Component Organization
```
src/components/
├── layout/          AuthProvider, AuthGuard, Sidebar
├── ui/              Button, Card, Input, Modal, Select, Checkbox, Badge, Spinner, etc.
├── shared/          format-currency, format-date, generate-id
├── dashboard/       DashboardPage
├── todos/           TodoList, TodoItem
├── calendar/        CalendarPage
├── calculator/      CalculatorPage, vat-calc, tax-calc, pricing-calc, calculator-utils
├── projects/        ProjectsPage, ProjectDetailPage, project-types
├── finance/         FinancePage, tax-engine, finance-types
├── documents/       DocumentsPage, monthly-export
└── preferences/     PreferencesPage
```

## Key Conventions

### RTL
- `<html lang="he" dir="rtl">` — all layout is RTL
- In flexbox `justify-between`: first child = RIGHT, last child = LEFT
- Sidebar is fixed on the right (`right-0`)
- Main content has `mr-0 lg:mr-64`

### Mobile Responsiveness
- Sidebar: hidden on mobile (`translate-x-full lg:translate-x-0`), hamburger button overlays
- Forms: `grid-cols-1 sm:grid-cols-2` pattern (stack on mobile)
- Modals: `rounded-none sm:rounded-2xl`, full-size uses `overflow-visible`
- Tables: wrap in `overflow-x-auto`

### Data Loading
- All pages load data in `useEffect` with `[user]` dependency
- Show spinner only on first load: `if (loading && data.length === 0) return <Spinner />`
- Dashboard caches data for 60 seconds (skip refetch on navigation)

### Destructive Buttons
- Use `variant="danger"` — subtle outline style: `text-red-600, white bg, thin border`
- Position: far LEFT in footer (last child in RTL `justify-between`)
- Primary actions (Save/Create) go RIGHT (first child in RTL)

### Images
- Store **path** (not full URL) in `image_url`
- Display via signed URLs (7-day expiry) with localStorage caching (24h)
- Pattern: `displayUrls[path] || path`
- Full URLs (old docs starting with `http`) are used directly

### Edge Functions
- `ocr-document` — document analysis via Gemini 2.5 Flash Lite
- `send-report` — PDF email via Resend API
- Deploy: `npx supabase functions deploy <name> --project-ref uqzlhaifylnhnbgrhdkw --no-verify-jwt`
- Secrets: `npx supabase secrets set KEY=VALUE --project-ref uqzlhaifylnhnbgrhdkw`
- Supabase project: `uqzlhaifylnhnbgrhdkw`

### PDF Generation
- Build PDF content as **pure HTML string with inline styles** (no Tailwind classes)
- Tailwind v4 uses `oklch()` colors which html2canvas cannot parse
- Create element from string, append to body, wait 100ms, capture with html2pdf
- Pattern:
```ts
const el = document.createElement("div");
el.innerHTML = buildPdfHtml();
el.style.width = "700px";
document.body.appendChild(el);
await new Promise((r) => setTimeout(r, 100));
await html2pdf().set({...}).from(el.firstElementChild).save();
document.body.removeChild(el);
```

### Preferences (Tax Settings)
- Stored in `tax_settings` table (one row per user)
- Editable via `/preferences/` page
- Used by: `calculateTaxes()` in tax-engine, `FutureTaxWidget`, dashboard greeting
- Business profile fields: `owner_name`, `business_name`, `vat_number`, `business_address`, `business_phone`, `accountant_email`

### Tests
- E2E: Playwright (`npm run test:e2e`)
- Unit: Node native test runner (`npm test`)
- Auth setup: `e2e/auth.setup.ts` logs in once, saves state
- Always add `.first()` to locators when duplicate elements may exist in the UI

### Git
- Commits are GPG-sign configured, but signing fails in non-interactive shells (no `/dev/tty`). Use `git commit --no-gpg-sign` when committing from automation.

## Run Commands
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Static export build
npm test             # Unit tests
npm run test:e2e     # Playwright E2E tests
npm run lint         # ESLint
```
