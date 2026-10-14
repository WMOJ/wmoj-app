---
name: judge-integration
description: How wmoj-app talks to the wmoj-judge service and turns its answer into a stored submission — `lib/judge.ts`, the `/submit`, `/generate-tests` and `/health` contract, the `X-Judge-Token` header, the two failure modes that arrive as HTTP 200, compile-error and checker-error handling, `recordSubmission`, verdict aggregation, the generator staleness guard, and when points recalculate. Use whenever someone touches the submit route, the generator routes, the status/health route, `lib/judge.ts`, `lib/submissionRecord.ts`, `lib/submissionRedaction.ts`, `VerdictBadge`, verdict or scoring logic, or debugs a submission that graded wrongly, was not stored, or shows the wrong verdict.
---

# Judge integration and the submission pipeline

Code execution and grading live in a separate repo/service, **`wmoj-judge`**, which has its own
`AGENTS.md` (sandbox, resource limits, full API contract). Any change to the `/submit` or
`/generate-tests` shape is a **cross-repo breaking change** — coordinate both sides.

## One module, three calls

All judge traffic goes through `lib/judge.ts` (`judgeSubmit`, `judgeGenerateTests`, `judgeHealthy`) —
one synchronous `fetch`, no retries, no timeout, no queue; the four routes never call `fetch`
themselves. The browser's submit blocks until every test case has run. The auth header is
**`X-Judge-Token`** (not `Authorization`), carrying `JUDGE_SHARED_SECRET`.

| App route | Judge endpoint |
|---|---|
| `api/problems/[id]/submit` | `POST /submit` |
| `api/{admin,manager}/problems/generator/generate` | `POST /generate-tests` |
| `api/status/health` | `GET /health` |

`NEXT_PUBLIC_JUDGE_URL` is read **server-side only**; the browser must never learn the judge URL
(hence `/status` proxying through `api/status/health`), and `api/status/health` must not forward the
judge's body. Never import `lib/judge.ts` or `lib/supabaseAdmin.ts` from a client component.

## The `/submit` contract

`POST /submit` sends `{language, code, input, output, timeLimit, memoryLimit, checker?}` — `checker`
**omitted entirely** when null or blank — and returns
`{summary:{total,passed,failed}, results[], effectiveMemoryLimitMb, compileError?, checkerError?}`.

The test data (`input`, `output`, `checker`) is read from `problem_tests` through
`lib/supabaseAdmin.ts`, the one service-role client; without `SUPABASE_SECRET_KEY` nothing grades.

**Both failure modes come back as HTTP 200.** The route branches on `checkerError` **first**,
returns early, and stores **no submission row**: a broken checker is a problem-configuration fault,
never the student's. Only then does it branch on `compileError`. A 4xx/5xx means the request or the
judge is wrong, never the user's code; the judge never emits `CE` — this app synthesizes it.

## Storing the result

**This app writes the verdict; the judge never touches Supabase.**

- Submissions are written by the `record_submission` RPC (security definer, one transaction) via
  `lib/submissionRecord.ts`, the only importer of `redactTestResults`/`redactSummary`.
- `recordSubmission` stores rows only for active problems and returns `writeFailed` — surfaced as
  `stored: false`, never a silent AC — when the RPC raises.
- **Submissions persist only for active problems.** Staff test-submissions against unpublished
  problems run and render but are never stored — the stat RPCs depend on this and carry no
  `is_active` filter.
- **Points/solved recalculate only on a first solve**, or when a manager deletes a submission (the
  manager `submissions/[id]` DELETE calls `recalc_user_stats`; there is no admin twin).
- `submissions.status` is GENERATED STORED from `summary` — never write it.
  `summary.verdict='CE'` is public, the compile message is not (it lives in `submission_private`).
- Public `results` is an ALLOWLIST (`lib/submissionRedaction.ts`); a denylist would republish
  `checkerMessage`, which quotes the answer. Never widen it without reading that file.
- `aggregateVerdict` (`components/VerdictBadge.tsx`) ranks the **full** verdict set, `IE` first — a
  per-case `IE` is a broken problem, not a wrong answer.

## Generator

The generator staleness guard is deliberate: on create it blocks submit, on edit one state blocks
and another only warns, so `generator_file` always matches the stored tests. `input`/`output` never
reach a browser; the staff editor gets `generator_file`, `checker` and a count.
