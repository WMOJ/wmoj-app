# RLS Policy Explanation

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
| **Admins can insert own problems** | An active admin can create a problem, but only if `created_by` is their own user ID and `is_active` is `false`. Problems must be created inactive — an admin cannot create a problem that is already active. |
| **Admins can update own problems** | An active admin can edit problems that they personally created. They cannot edit problems created by other admins. Additionally, they cannot change the `is_active` flag through this policy — the update is only permitted if `is_active` stays the same as it currently is in the database. |
| **Admins can delete own problems** | An active admin can delete problems that they personally created. |
| **managers_all_problems** | An active manager has full unrestricted access — they can read, create, update, and delete any problem, regardless of who created it and with no field restrictions. |

---

### `contests`

Stores programming contests.

| Policy | What it means |
|--------|---------------|
| **Allow all users to view contests** | Anyone — logged in or not — can read all contests. |
| **Admins can insert own contests** | An active admin can create a contest, but only if `created_by` is their own user ID and `is_active` is `false`. Contests must be created inactive — an admin cannot create a contest that is already active. |
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

