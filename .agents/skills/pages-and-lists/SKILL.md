---
name: pages-and-lists
description: House patterns for building UI in wmoj-app — adding a route (`page.tsx` + `*Client.tsx` + `loading.tsx`), server-paginated lists and tables, submission lists, dialogs, navbar dropdowns, styling tokens, and the twinned `admin/*` and `manager/*` staff trees. Use whenever someone adds or changes a page, route, list, table, filter, pagination, modal, dropdown, button or loading skeleton, touches anything under `app/admin`, `app/manager`, `api/admin`, `api/manager` or `components/staff`, or fixes dark-on-dark text in the navbar, a list that shows stale rows after a mutation, or an aggregate that silently stops at 1000 rows.
---

# Pages, lists and staff screens

## Adding a route

- `page.tsx` is a server component (auth + data fetching); its sibling `'use client'` `*Client.tsx`
  renders. No `page.tsx` contains `'use client'`. Mutations go through an `app/api/**/route.ts`
  handler called with `fetch` — there are no Server Actions.
- Type `params` and `searchParams` as `Promise<{…}>` and await them.
- **Every route has a `loading.tsx`** (only `app/auth/*` lack one) — **add one per new route**:
  `SkeletonLoader.tsx` + `loading-shimmer`, `role="status" aria-busy="true"`, `sr-only`, page chrome.
- Staff pages guard through `lib/staffAuth.ts` (`requireActiveManager()`/`requireActiveAdmin()`).
- **Don't use `useSearchParams` in a client component** — derive filter state from server props.
- Routes die quietly (server components query Supabase directly) — before changing or deleting an
  API route, grep `fetch(` for its callers.
- State is `AuthContext`, `CountdownContext`, `ThemeContext`. No Redux. SWR in two components only.

## Lists paginate on the server

Copy `app/admin/problems/manage/`, don't invent a variant.

- `page.tsx` fetches one page: `parsePage` → `.range(computeRange(…))` with `{ count: 'exact' }` →
  `clampPage` + `redirect` (all in `lib/pagination.ts`).
- The client uses `usePaginatedNavigation` + `<Pagination>` + `<DataTable>`.
- Never client-paginate a DB-backed list.
- Never `setRows(prev => …)` after a mutation — `startTransition(() => router.refresh())`.
- Never enrich beyond the current page's ids (submission pages: `resolveSubmissionNames`).
- **Never select `code`/`results` in a submission-list query** — `useViewCode` +
  `SubmissionDetailModal` fetch and render them on demand.
- `DataTable` sorting is disabled (it would be page-local).
- Any unbounded `.select()` that feeds an aggregate goes through `lib/fetchAllRows.ts` (PostgREST
  answers 206 past its cap and `postgrest-js` calls that success).
- Column lists live in `lib/queries/<table>.ts` beside their `Pick<Row<…>>` types; spell a
  `.select()` list inline only for a one-off scalar.

## Components and styling

- Tailwind v4 tokens (`bg-surface-2`, `text-text-muted`, `text-brand-primary`, `border-border`), not
  raw colors; `.glass-panel` for cards; `DataTable` for tables; `toast.*` for action feedback.
  Tokens live in `app/globals.css` — there is no `tailwind.config.*`.
- **No `Button` component, and no `cn`/`clsx`/`twMerge`/`cva`** — none installed. Raw `<button>`s
  with template-literal ternaries *are* the convention; every component takes `className?` last.
- Use `ui/Modal.tsx` for any dialog — it carries the focus trap and the `aria` wiring.
- **Put `data-panel` on any dropdown inside `UserNavbar`.** In light mode `globals.css` re-declares
  the raw vars dark under `[data-navbar]` and `data-panel` resets them; omitting it renders
  dark-on-dark. In dark mode the navbar is the page's surface-1 and the attribute is inert.
- **Dark mode is real.** `ThemeContext` exposes `theme` (light/dark/system) and `resolvedTheme`;
  `ThemeToggle` cycles them and sits in the navbar, the staff `Header` and the auth pages. Text on a
  `bg-brand-primary` fill is `text-on-brand`, never `text-white`: the dark brand is light. Raw colours
  stay only for overlays (`bg-black/*`), the always-dark code block, leaderboard medals, pie slices and
  statement images. Check a new colour in both themes; `.dark` tokens are in `globals.css`.
- **`MarkdownRenderer`'s rehype order `rehypeRaw → rehypeSanitize → rehypeKatex` is
  security-critical.** Reordering it either opens XSS or silently kills all math.

## `admin/*` and `manager/*` are twin trees — edit both

The create/edit forms and the help guide's shared sections live in `components/staff/`, parameterised
by `tree` (`lib/staffPolicy.ts`); their `*Client.tsx` files are thin adapters (the help ones pass in
only their divergent prose). Everything else — the `manage` screens, dashboards, submission lists and
every `api/**` route — is still a twin: grep the twin path first, edit both. Manager alone owns
`newsposts` and `users/[id]/*`.

The deltas are data in `lib/staffPolicy.ts` (`STAFF_POLICY`) and every twinned route reads them —
never inline `is_active: false` or `.eq('created_by', …)` again. The manager `submissions/[id]`
DELETE calls `recalc_user_stats`; the admin one was deleted (no policy fits) — do not reintroduce it.

In API routes reuse `getAdminSupabase`/`getManagerSupabase` rather than re-inlining the Bearer/cookie
preamble; for non-staff bearer routes use `requireUser(request)` (`lib/requestAuth.ts`);
`parseBearerHeader` is the one token parser. No fifth spelling of either.
