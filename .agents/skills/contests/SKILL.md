---
name: contests
description: The rules behind WMOJ contests — how contest status is computed (never stored), which problems may be added to which contest, how participation timers are read and ended, how `join_history` and `countdown_timers` must be written, and how contest leaderboards are scored. Use whenever someone touches contest pages or `api/contests/**` routes (join, leave, timer, participation), `lib/contestTimer.ts`, `lib/contestScoring.ts`, `lib/contestValidation.ts`, `getContestStatus`, the contest-problem picker, or debugs a wrong contest status, a timer that expires early or never, a `23505` on join/leave, or a wrong leaderboard.
---

# Contests

## Status is computed, never stored

Always compute contest status with `getContestStatus()`. Both timestamps null means `virtual`, not
`inactive`. There is no status column — do not add one, and do not compare timestamps inline.

`problems` has NO `contest` column either: the relationship is the `contest_problems` junction.
Count membership by joining it, derive "standalone" by anti-joining it.

## Contest-problem eligibility

A problem in a *rated* contest that is ongoing or upcoming can't be added elsewhere; a *rated*
target contest accepts only problems not already in another contest.

## Timers are read-only to read

- `readTimer` (`lib/contestTimer.ts`) fails closed: error, missing row or null `started_at` ⇒ expired.
- A participation ends only via `expireParticipation` (`POST /leave`) or
  `sweep_expired_participation()`, which `POST /join` and `POST /leave` call first.
  `GET /timer` never writes.
- Stamp `left_at` with `.update()` on `(user_id, contest_id)` filtered `is null` — never `.upsert()`
  (PK is `id` ⇒ `23505`), never unfiltered (it would overwrite the sweep's true end instant).
- `countdown_timers` has the same PK/UNIQUE split; `join` passes `onConflict` on both writes.

## Leaderboards

Contest leaderboards are **not point-weighted** — each problem contributes at most 1.0
(`scoreParticipants`, `lib/contestScoring.ts`, tested). Change the scoring there and in its test,
not in a page.

## Who may do what

Admin-created contests land *pending* (`is_active = false`); manager-created contests go live
immediately. Only managers flip `is_active` or edit an already-activated contest. Those deltas are
data in `lib/staffPolicy.ts` (`STAFF_POLICY`) — read them, never inline them. Hidden contests return
**404, not 403** (`canUserAccessContest`).
