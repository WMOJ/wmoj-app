---
name: schema-change
description: Change or query the WMOJ Supabase database safely. Covers the migration procedure for any change to the database's shape (tables, columns, constraints, indexes, RLS policies, functions, triggers, RPCs, enums, extensions, storage buckets), the schema fingerprint and generated types that must move with it, and the per-table traps — the private-data split, `problem_tests`, generated and missing columns, missing FKs, the scoring RPCs. Use whenever someone writes a migration, runs DDL through the Supabase MCP, dashboard or SQL editor, adds or tightens an RLS policy, adds a column or table, regenerates database types, or writes a new query against `problems`, `problem_tests`, `submissions`, `submission_private` or `users`.
---

# Changing the WMOJ schema

Live Supabase project **`WMOJ`** (ref `usltyqkrptaaktnmjeyf`, us-east-2, Postgres 17): 15 tables, RLS
on all of them, two public buckets (`avatars`, `problem_images`, 5 MB per object). Inspect it with the
Supabase MCP. There is no drift detection — live and `supabase/migrations/` agree only because you
keep them agreeing; the `local-dev` skill replays the migrations onto an empty database and
fingerprints the result against prod.

## Every schema change must be a new migration file

**Any change to the database's *shape* gets a NEW file in `supabase/migrations/`** — tables, columns,
constraints, indexes, RLS policies, functions, triggers, RPCs, enums, extensions, and storage buckets
or their policies — whether via the Supabase MCP, the dashboard, or the SQL editor. Row and data
changes get **no file**, however many rows: publishing a problem, editing a statement, flipping
`is_active`, creating contests or users, granting roles, recalculating points. Only shape counts.

- **Never edit an existing migration**, the baseline `20260814152742_initial_schema.sql` included.
  History stays append-only; correct a mistake with a new migration on top.
- Name files `YYYYMMDDHHMMSS_short_snake_case_description.sql` with the real current timestamp.
- One logical change per file, opening with a comment saying what it does and why. Idempotent where
  practical (`if not exists`, `or replace`), matching the baseline's style.
- Apply the SQL to the live project, commit the file, update `supabase/schema-fingerprint.sql` and
  regenerate types — all in one change, never one without the others, or history drifts from reality.

## Generated types

`main/src/types/database.types.ts` comes from `npm run gen:types` (run in `main/`; it reads the
**local** stack, so replay the new migration there first — see `local-dev`). All three Supabase
clients carry `<Database>`. Regenerate after every migration and commit the diff; never hand-edit it.
Annotate client parameters `AppSupabaseClient` (`types/supabase.ts`), never bare `SupabaseClient`.

Column lists live in `lib/queries/<table>.ts` beside their `Pick<Row<…>>` types; spell a `.select()`
list inline only for a one-off scalar. A new or dropped column means updating the list there.

## Design rule: private data is split off, never policy-hidden

**Reads are permissive and RLS filters ROWS, NOT COLUMNS.** A column on a world-readable table is
public no matter what the app selects. So anything private goes in its own table with its own
policies. Writes stay tight; permissive reads never bless a loose write policy.

- **Submissions.** `submissions.code`/`input`/`output` are DROPPED; source, the full per-case array
  and the compile message live in owner+staff-only `submission_private`. Public `results` keeps only
  an ALLOWLIST (`lib/submissionRedaction.ts`); a denylist would republish `checkerMessage`, which
  quotes the answer.
- **Users.** `anon` lost `users.email`/`last_login`/`profile_data` — never name them anon-side.
- **The graded data lives in `problem_tests`, not `problems`.** `input`, `output` (the answer key),
  `checker` and `generator_file` live in a staff-only side table (on world-readable `problems` they
  were public) and were DROPPED from `problems`. One copy, no fallback. Staff read it through the
  ordinary client, the submit route through `lib/supabaseAdmin.ts`. `input`/`output` never reach a
  browser; the staff editor gets `generator_file`, `checker`, a count.
- **The service-role client** (`lib/supabaseAdmin.ts`) READS `problem_tests` and nothing else. The
  raw client is not exported — add a named function there, never a new caller of it.

## Easy to get wrong

- **`problems` has NO `contest` column.** The relationship is the `contest_problems` junction: count
  membership by joining it, derive "standalone" by anti-joining it. Nothing in `main/src` names the
  column now. Don't reintroduce it.
- **`submissions.status` is GENERATED STORED** from `summary->>'failed'`/`'total'`. Never write it.
- **`submissions.problem_id`/`user_id` have no FKs.** Orphans are possible.
- **Contest status is never stored** — always compute it with `getContestStatus()`. Both timestamps
  null means `virtual`, not `inactive`.
- **Compile errors:** `summary.verdict='CE'` is public, the message is not. No `verdict` column.
- **Submissions are written by the `record_submission` RPC** (security definer, one transaction) via
  `lib/submissionRecord.ts` — not by a client-side insert.
- **Scoring** lives in `recalculate_problems_solved(uid)` / `recalculate_user_points(uid)` (top-100
  problems, `points * 0.95^i`, plus a `150*(1-0.997^n)` bonus). Both are **revoked from `anon` and
  `authenticated`** — call the guarded wrapper `recalc_user_stats(target)` instead. The
  `/pointsystem` page mirrors the formula — change both together. The stat RPCs carry no `is_active`
  filter: they rely on submissions being stored only for active problems.
- **`join_history` and `countdown_timers` have PK `id` plus a separate UNIQUE** on
  `(user_id, contest_id)` — an `.upsert()` without `onConflict` raises `23505`. See `contests`.
