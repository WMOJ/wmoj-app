# wmoj-app — agent guide

WMOJ (White Oaks Modern Online Judge), a competitive-programming platform run by the White Oaks
Secondary School CS Club. This repo is the web app + backend-for-frontend: **Next.js 16 (App
Router) + React 19 + Tailwind v4 on Supabase**, deployed to Vercel. Code execution and grading live
in a separate repo/service, **`wmoj-judge`**, called over HTTP.

## The app is `main/`, not the repo root

The repo root is NOT the Next.js project: **run every npm command from `main/`** (`@/*` →
`main/src/*`). Vercel's Root Directory points there, set in the dashboard only. The root holds
`.agents/` (agent config; `.claude` is a symlink to it, both tracked in git), `supabase/migrations/`
(DB history; the first file is the full baseline schema), `CONTEXT.md` (the domain terms modules are
named after) and a `package.json` shim with no scripts that exists only to ship `@vercel/analytics`.

## Skills

This file holds only what every change must respect. The detail lives in `.agents/skills/` — **load
the matching skill before starting the work it names**, rather than re-derive what it covers:

- **`schema-change`** — any change to the database's shape, or a new query against `problems`,
  `submissions` or `users`: the migration procedure, fingerprint, types, per-table traps.
- **`judge-integration`** — the submit/generator/health routes, `lib/judge.ts`, the judge contract and
  its failure modes, verdicts, what gets stored, when points recalculate.
- **`contests`** — contest status, problem eligibility, timers and participation, leaderboards.
- **`pages-and-lists`** — a new route, page, list, table, dialog or dropdown; pagination; styling;
  anything under the twinned `admin/*` and `manager/*` trees.
- **`add-problem`** — publishing problems end to end: statement, generator, tests, checker, insert.
- **`local-dev`** — the whole stack on a laptop: Supabase CLI, a local database matching prod.

## Commands

```bash
cd main
npm run dev      # next dev --turbopack → :3000
npm run build    # next build --turbopack; typechecks only route-reachable code
npm run lint     # bare eslint — at ZERO problems and must stay there; run it yourself
npx tsc --noEmit # the typecheck gate — no npm script exists for it
npm test         # node --test via tsx over src/**/*.test.ts; pure functions only
```

Anything taking a Supabase client is verified by running the app. Node ≥20.9. **No env var is
validated at boot** — `.env.example` lists them; `SUPABASE_SECRET_KEY` is server-only, bypasses RLS.

Commits are Conventional Commits, lowercase after the colon. **Never add an agent co-author trailer.**

## Architecture

- **Server/client split, no exceptions**: every `page.tsx` (auth + data fetching) has a sibling
  `'use client'` `*Client.tsx`. No `page.tsx` contains `'use client'`. Every route has a `loading.tsx`.
- **No Server Actions anywhere** (`'use server'` = 0). Every mutation goes through an
  `app/api/**/route.ts` handler, called with `fetch` from a client component.
- **Next 16 async params**: every dynamic route and every page taking `searchParams` types them
  `Promise<{…}>` and awaits — zero violations. Keep it that way.
- **Three Supabase clients** in `src/lib/`, all on the publishable (anon) key: `supabase.ts` (browser),
  `supabaseServer.ts` → `getServerSupabase()` (cookies) / `getServerSupabaseFromToken()` (Bearer).
- **No `middleware.ts`** — deliberate. Auth = SSR checks in `page.tsx` via `lib/staffAuth.ts`
  (`requireActiveManager()`/`requireActiveAdmin()`) plus `lib/adminAuth.ts`/`lib/managerAuth.ts` in
  API routes, with **RLS as the real boundary**. Reuse `getAdminSupabase`/`getManagerSupabase` and,
  for non-staff bearer routes, `requireUser(request)` (`lib/requestAuth.ts`) — never re-inline the
  Bearer/cookie preamble. Hidden resources return **404, not 403**.
- **Exactly ONE service-role client**, `lib/supabaseAdmin.ts`: READS `problem_tests`, nothing else.
  The raw client is **not exported — add a named function there, never a new caller of it**. Bypasses
  RLS, `server-only` (client import = build error), **never a client prop**. No `SUPABASE_SECRET_KEY`
  ⇒ nothing grades.
- **Generated types:** `src/types/database.types.ts`, from `npm run gen:types`; never hand-edit it.
  Annotate client parameters `AppSupabaseClient` (`types/supabase.ts`), never bare `SupabaseClient`.
- **`admin/*` and `manager/*` are twin trees — edit both.** Only the create/edit forms and help guide
  are shared (`components/staff/`); every `manage` screen, dashboard, submission list and `api/**`
  route is a twin: grep the twin path first. The deltas are data in `lib/staffPolicy.ts`
  (`STAFF_POLICY`) — never inline `is_active: false` or `.eq('created_by', …)` again.

**Roles: manager > admin > regular.** Admin-created problems and contests land *pending*
(`is_active = false`); manager-created contests go live immediately. Only managers flip `is_active`,
manage users, or edit an already-activated contest.

## Database

Live Supabase project **`WMOJ`** (ref `usltyqkrptaaktnmjeyf`, us-east-2, Postgres 17), RLS on all 15
tables; inspect it with the Supabase MCP. No drift detection — live and `supabase/migrations/` agree
only because you keep them agreeing. Load `schema-change` before touching its shape.

- **Any change to the database's *shape* gets a NEW file in `supabase/migrations/`** — tables,
  columns, constraints, indexes, RLS policies, functions, triggers, RPCs, enums, extensions, and
  storage buckets or their policies — whether via the Supabase MCP, the dashboard, or the SQL
  editor. Row and data changes get **no file**, however many rows. Only shape counts.
- **Never edit an existing migration**, the baseline `20260814152742_initial_schema.sql` included.
  History stays append-only; correct a mistake with a new migration on top.
- Apply the SQL to the live project, commit the file, update `supabase/schema-fingerprint.sql` and
  regenerate types — all in one change, never one without the others, or history drifts from reality.
- **Reads are permissive and RLS filters ROWS, NOT COLUMNS — so private data is SPLIT OFF, never
  policy-hidden.** `submissions.code`/`input`/`output` are DROPPED; source, the full per-case array
  and the compile message live in owner+staff-only `submission_private`. Public `results` keeps only
  an ALLOWLIST (`lib/submissionRedaction.ts`); a denylist would republish `checkerMessage`, which
  quotes the answer. `anon` also lost `users.email`/`last_login`/`profile_data` — never name them
  anon-side. Writes stay tight; permissive reads never bless a loose write policy.
- **The graded data lives in `problem_tests`, not `problems`** — `input`, `output` (the answer key),
  `checker`, `generator_file`, in a staff-only side table. One copy, no fallback. Staff read it
  through the ordinary client, the submit route through `lib/supabaseAdmin.ts`. `input`/`output`
  never reach a browser; the staff editor gets `generator_file`, `checker`, a count.
- Never write `submissions.status` (GENERATED STORED). `problems` has NO `contest` column — join
  `contest_problems`. Contest status is never stored — compute it with `getContestStatus()`.

## Judge

All judge traffic goes through `lib/judge.ts`; no route calls `fetch` on the judge itself. **This app
writes the verdict; the judge never touches Supabase**, and submissions persist only for active
problems. `NEXT_PUBLIC_JUDGE_URL` is read **server-side only** — the browser must never learn the
judge URL, and `api/status/health` must not forward the judge's body. Never import `lib/judge.ts` or
`lib/supabaseAdmin.ts` from a client component. Any change to the `/submit` or `/generate-tests`
shape is a **cross-repo breaking change** — `wmoj-judge` has its own `AGENTS.md`; coordinate both.

## Conventions & don'ts

- Tailwind v4 is CSS-first: **no `tailwind.config.*`**, tokens live in `app/globals.css`. Use them
  (`bg-surface-2`, `text-text-muted`, `border-border`), not raw colors. **Dark mode does not exist.**
- **No `Button` component, and no `cn`/`clsx`/`twMerge`/`cva`** — none installed. Raw `<button>`s
  with template-literal ternaries *are* the convention; every component takes `className?` last.
- **`MarkdownRenderer`'s rehype order `rehypeRaw → rehypeSanitize → rehypeKatex` is
  security-critical.** Reordering it either opens XSS or silently kills all math.
- **Lists paginate on the server**, never in the client, and a submission-list query **never selects
  `code`/`results`**. Copy `app/admin/problems/manage/`; the rest is in `pages-and-lists`.
- Routes die quietly (server components query Supabase directly) — grep `fetch(` for callers first.

---

## Maintenance

Keep this file current — fix anything here that is outdated, wrong or missing as part of your change;
letting it go stale is leaving the work unfinished. And keep it **at or under 150 lines**.

⚠️ **Maintenance here is ZERO-SUM.** The line budget is the point, not an accident: a file nobody
finishes reading is a file that does not guide anything. So the test for whether something belongs
in `AGENTS.md` is not "is this true and useful" — almost everything is — it is:

> **Is this worth removing something else to make room for?**

If the answer is no, it does not go here. If the answer is yes, name what you are cutting and cut it
in the same change. Only when there is genuinely spare room may you add without removing.

Three questions settle most cases:

1. **Does it have a detectable trigger?** ("when adding a paginated list", "when authoring a
   problem", "when extracting a statement figure") → it belongs in a **skill**, where it loads
   exactly when it is needed and costs nothing when it is not. This is the default answer; prefer it.
2. **Is it broad and unconditional** — something every change in this repository must respect
   regardless of what it touches? → it belongs here.
3. **Otherwise** → it is bloat. Delete it, or leave it as a comment beside the code it describes,
   which is where a narrow fact stays honest for longest.
