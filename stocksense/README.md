# StockSense — Inventory Management System (Frontend)

A modular, real-time inventory management frontend that replaces manual
registers, spreadsheets and scattered tracking with one centralized app.
Built for a hackathon demo, structured like a production SaaS product.

> This is the **frontend only**. It runs entirely on a bundled mock data
> layer out of the box — no backend required — and is structured so a real
> API can be plugged in by flipping one environment variable.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + TypeScript | Type safety, huge ecosystem, fast to onboard teammates |
| Build tool | Vite | Instant dev server, fast HMR, zero-config TS/JSX |
| Styling | Tailwind CSS | Consistent design tokens without hand-rolled CSS files |
| Routing | React Router 6 | Standard, small, well documented |
| State | React state + Context | The app doesn't need Redux-scale state; Auth/Toast contexts are enough |

No UI kit was pulled in — every component (`Button`, `Input`, `Modal`,
`Table`, `Card`…) is hand-built in `src/components/ui`, so there's nothing
"black box" to explain to judges.

## Getting started

```bash
npm install
cp .env.example .env   # already done for you — see below
npm run dev
```

Open http://localhost:5173. Log in with **any email** and a password of
**6+ characters** — the app runs on mock data, so there's nothing to seed.

To reset your password: use **Forgot password**, then enter the demo code
`123456` (the mock auth service always accepts this code).

### Connecting a real backend

Everything the UI needs goes through `src/services/*Service.ts`, which in
turn goes through `src/services/apiClient.ts`. To switch from mock data to
a real API:

1. Set `VITE_API_BASE_URL` in `.env` to your backend's URL.
2. Set `VITE_USE_MOCKS=false`.
3. Make sure your backend's JSON responses match the shapes in `src/types/index.ts`.

No component code changes — every page calls the same service functions
either way.

## Project structure

```
src/
  components/
    layout/       Sidebar, Topbar, AppShell (the authenticated page frame)
    ui/            Reusable primitives: Button, Input, Select, Modal, Table,
                   Card, Badge, Spinner, EmptyState, ErrorState, KpiCard
    ProtectedRoute.tsx
  context/
    AuthContext.tsx      current user + login/signup/logout
    ToastContext.tsx      global toast notifications
  hooks/
    useForm.ts     generic form state + validation
    useAsync.ts     generic loading/error/success data-fetching hook
  services/
    apiClient.ts          fetch wrapper: base URL, auth header, timeouts, error shaping
    mockData.ts            in-memory dataset (the only file to delete once a real backend exists)
    authService.ts          login / signup / OTP reset
    productService.ts       products + categories
    operationsService.ts    receipts, deliveries, transfers, adjustments, move history, dashboard stats
  pages/
    auth/           Login, Signup, ForgotPassword (+ shared AuthLayout)
    products/       Products list + ProductFormModal
    operations/     OperationsListPage (generic) + thin wrappers for each
                     operation type, DocumentFormModal (generic create form),
                     MoveHistory
    settings/       Warehouses
    Dashboard.tsx, Profile.tsx, NotFound.tsx
  types/index.ts    every shared TS interface (Product, StockDocument, …)
  utils/validators.ts   composable field validators used by every form
```

### Why one `OperationsListPage` for four screens?

Receipts, Delivery Orders, Internal Transfers and Stock Adjustments are the
same underlying concept — a `StockDocument` moving through
`Draft → Waiting → Ready → Done` — with different labels and a couple of
different fields (transfers need a destination location; adjustments allow
negative quantities). Rather than four near-identical files, there's one
configurable list page and one configurable form modal, and each operation
type is a ~15-line file that just supplies its config. Change the table
columns once, every operation screen gets it.

## UX states

Every data screen (`useAsync`) and every form (`useForm`) goes through the
same states, deliberately, everywhere:

```
Initial → Loading → Success ⇄ Empty
                 ↘ Error (with Retry)
```

Forms additionally block submission until every field passes its
validators (`src/utils/validators.ts`) — see `DocumentFormModal` and
`ProductFormModal` for examples of required fields, numeric checks, and
inline error messages.

## Design notes

The palette leans into the subject matter rather than a generic SaaS
blue-and-white: a dark slate (`ink-900`) sidebar evokes steel shelving,
paired with a safety-amber accent (`amber-500`) — the color of warehouse
hazard markings and forklift equipment. SKUs, quantities and ledger
entries use a monospace face (IBM Plex Mono) since they're data to be
scanned, not prose to be read. Tailwind tokens for both live in
`tailwind.config.js`.

## Git workflow for a multi-person team

This repo is structured so several people can work without stepping on
each other:

```
main                          protected, always deployable
 └── develop                  integration branch
      ├── feature/frontend-ui
      ├── feature/api-integration
      ├── feature/file-upload
      └── feature/results-dashboard
```

- Branch off `develop` for each feature; open a PR back into `develop`.
- Merge `develop` → `main` only for demo-ready checkpoints.
- Keep commits scoped and descriptive (`feat: add adjustment reason field`,
  `fix: transfer validation when source = destination`).
- One person "owns" a folder for a work session (e.g. `pages/operations/`)
  to avoid merge conflicts — the modular structure above makes that natural,
  since each screen/service is its own file.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production (`dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Known gaps / next steps

- File upload (bulk product import) has a validator (`validateFile` in
  `utils/validators.ts`) but no UI yet — wire it up once the import
  endpoint exists.
- `Profile.tsx` simulates a save (there's no `/profile` endpoint in the
  mock layer yet); swap in a real `updateProfile` call in
  `authService.ts` when the backend adds one.
- Role-based UI (Inventory Manager vs Warehouse Staff seeing different
  actions) is modeled in `User.role` but not yet enforced in the UI.
