# RLS Policy Explanation

This document describes every Row-Level Security (RLS) policy in the database in plain English, and summarises what each type of user account can and cannot do.

---

## What is RLS?

Row-Level Security is a database-level access control system. Every time the application reads or writes data, Postgres automatically checks whether the logged-in user is allowed to perform that operation on that specific row. If no policy permits the action, it is silently blocked. These rules are enforced at the database layer regardless of what the application code does.

---

## Tables and Their Policies

### `users`

Stores the public profile for every account in the system.

| Policy | What it means |
|--------|---------------|
| **Users can insert own profile** | When you sign up, you can create exactly one row in this table — and only for yourself. You cannot create a profile on behalf of someone else. |
| **users_select_all_authenticated** | Any logged-in user can read the full `users` table. Anonymous (not logged in) visitors cannot. |
| **Users can update own profile** | You can edit your own profile row. You cannot edit anyone else's. |
| **Users can delete own profile** | You can delete your own profile row. You cannot delete anyone else's. |
| **managers_all_users** | An active manager has full read/write/delete access to every row in this table. |

---

### `admins`

Stores one row per admin account. An admin must also have a row in `users`.

| Policy | What it means |
|--------|---------------|
| **Admins can insert own profile** | You can create your own admin row. You cannot create one for another user. |
| **Admins can view own profile** | You can read your own admin row. You cannot see other admins' rows through this policy. |
| **Admins can update own profile** | You can update your own admin row. |
| **Admins can delete own profile** | You can delete your own admin row. |
| **managers_all_admins** | An active manager has full read/write/delete access to every row in this table. |

---

### `managers`

Stores one row per manager account. A manager must also have a row in `users`.

| Policy | What it means |
|--------|---------------|
| **managers_insert_own** | You can create your own manager row. |
| **managers_select_own** | You can read your own manager row. |
| **managers_update_own** | You can update your own manager row. |
| **managers_delete_own** | You can delete your own manager row. |
| **managers_admin_all** | An active admin can read, create, update, or delete *any* manager row. This is how admins promote or demote managers. |
| **managers_all_managers** | An active manager has full read/write/delete access to every manager row, including other managers'. |

---

### `problems`

Stores the programming problems that users can solve.

| Policy | What it means |
|--------|---------------|
| **Allow all users to view problems** | Anyone — logged in or not — can read all problems. |
| **Admins can insert own problems** | An active admin can create a problem, but only if the `created_by` field is set to their own user ID. They cannot create a problem attributed to someone else. |
| **Admins can update own problems** | An active admin can edit problems that they personally created. They cannot edit problems created by other admins. Additionally, they cannot change the `is_active` flag through this policy — the update is only permitted if `is_active` stays the same as it currently is in the database. |
| **Admins can delete own problems** | An active admin can delete problems that they personally created. |
| **managers_all_problems** | An active manager has full unrestricted access — they can read, create, update, and delete any problem, regardless of who created it and with no field restrictions. |

---

### `contests`

Stores programming contests.

| Policy | What it means |
|--------|---------------|
| **Allow all users to view contests** | Anyone — logged in or not — can read all contests. |
| **Admins can insert own contests** | An active admin can create a contest, but only if `created_by` is set to their own user ID. |
| **Admins can update own contests** | An active admin can edit contests they personally created. They cannot change the `is_active` flag through this policy — it must remain unchanged. |
| **Admins can delete own contests** | An active admin can delete contests they personally created. |
| **managers_all_contests** | An active manager has full unrestricted access — they can read, create, update, and delete any contest, regardless of who created it and with no field restrictions. |

---

### `contest_participants`

Records which users have joined which contests.

| Policy | What it means |
|--------|---------------|
| **read contest participants** | Anyone — logged in or not — can see all participation records. |
| **contest_participants_insert_own** | A logged-in user can register themselves as a participant. They cannot register someone else. |
| **cp_update_own** | A logged-in user can update their own participation record. They cannot update someone else's. |
| **contest_participants_delete_own** | A logged-in user can remove their own participation record. |
| **Admins can manage contest participants** | An active admin can read, create, update, or delete any participation record for any user in any contest. |
| **managers_all_contest_participants** | An active manager has the same full access — read, create, update, and delete any participation record. |

---

### `submissions`

Records code submissions made by users.

| Policy | What it means |
|--------|---------------|
| **Allow everyone to view submissions** | Anyone — logged in or not — can read all submissions. |
| **Allow insert for authenticated** | Despite its name, this policy applies to all roles including anonymous visitors — anyone can insert a submission with no login required and no ownership check. The application code is solely responsible for setting `user_id` correctly. |
| **managers_all_submissions** | An active manager has full access — read, create, update, and delete any submission. |

---

### `countdown_timers`

Stores per-user countdown timers (e.g. time remaining in a contest session).

| Policy | What it means |
|--------|---------------|
| **Users can view their own timers** | You can only see your own timers. You cannot see timers belonging to other users. |
| **Users can insert their own timers** | You can create a timer only for yourself. |
| **Users can update their own timers** | You can update your own timers only. |
| **Users can delete their own timers** | You can delete your own timers only. |
| **Admins can manage countdown timers** | An active admin has full read/write access to every timer for every user. |
| **managers_all_countdown_timers** | An active manager has the same full access to every timer for every user. |

---

### `join_history`

Records a log of when users joined contests or other events.

| Policy | What it means |
|--------|---------------|
| **Users can view all join history** | Any logged-in user can read the entire join history for all users. Anonymous visitors cannot. |
| **Users can add their own join history** | A logged-in user can insert a history record only for themselves. |
| **Admins can manage join history** | An active admin has full read/write/delete access to all join history records. |
| **managers_all_join_history** | An active manager has the same full read/write/delete access to all join history records. |

---

## Summary by Account Type

### Regular User (logged in, no admin or manager row)

- **Can read:** all problems, all contests, all contest participants, all submissions, all join history (when logged in), all other user profiles (when logged in)
- **Can write:**
  - Their own `users` profile (insert, update, delete)
  - Their own `contest_participants` rows (join, update, leave)
  - Their own `countdown_timers` (full CRUD)
  - Their own `join_history` entries (insert only)
  - Any submission (insert only — no ownership restriction enforced at DB level)
- **Cannot:** create or modify problems, contests, other users' data, or anything in `admins`/`managers`

### Anonymous Visitor (not logged in)

- **Can read:** all problems, all contests, all contest participants, all submissions
- **Can write:** insert submissions (the submissions insert policy applies to all roles with no authentication check)
- **Cannot:** write anything else, read user profiles, read join history

### Manager (logged in, has an active row in `managers`)

Full unrestricted access to the entire database. An active manager can read, create, update, and delete rows in every table without exception:

- `users` — any user's profile
- `admins` — any admin row
- `managers` — any manager row, including other managers'
- `problems` — any problem, any field, no ownership restriction
- `contests` — any contest, any field, no ownership restriction
- `contest_participants` — any participation record
- `submissions` — any submission
- `countdown_timers` — any user's timers
- `join_history` — any history record

### Admin (logged in, has an active row in `admins`)

Broad control with some ownership restrictions:

- **Problems:** create (attributed to themselves), update their own, delete their own — cannot change `is_active` via the admin update policy
- **Contests:** create (attributed to themselves), update their own, delete their own — same `is_active` restriction applies
- **Contest participants:** full access — read, create, update, delete any record
- **Countdown timers:** full access to every user's timers
- **Join history:** full access — read, insert, update, delete any record
- **Managers:** full control — can create, read, update, and delete any manager row
- **Admins:** can only manage their own `admins` row (no policy gives one admin control over another admin's row)

---

## Key Observations

1. **"Active" check is mandatory for privilege.** Manager and admin powers only apply when `is_active = true` in the respective role table. A deactivated admin or manager loses all elevated permissions immediately without needing their account deleted.

2. **Managers have broader access than admins.** Managers have unrestricted full access to every table. Admins are limited to managing content they personally created (for problems and contests) and cannot manage other admins' rows.

3. **Admins own their own content.** An admin can only create/delete the problems and contests they personally created. There is no policy allowing one admin to delete another admin's content.

4. **Public read is broad.** Problems, contests, contest participants, and submissions are all publicly readable without login. User profiles and join history require a login to read.

5. **Submissions have no authentication or ownership enforcement at the DB level.** The insert policy applies to all roles including anonymous visitors — anyone can insert a submission row with no login required and no check that `user_id` matches the caller. The application code is solely responsible for setting `user_id` correctly.

6. **No cross-admin control.** There is no policy that lets one admin manage another admin's row. Admin row management is self-service only.
