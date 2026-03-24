# Database Row Level Security (RLS) Policies

This document outlines the Row Level Security (RLS) policies active on the Supabase PostgreSQL database for each table in the `public` schema.

## `admins`
| Policy Name | Action | Roles | Description |
| :--- | :---: | :---: | :--- |
| **Admins can view all admins** | `SELECT` | `public` | Allows verified admins to view the list of all admins. |
| **managers_all_admins** | `ALL` | `authenticated` | Grants managers full access to all admin profiles. |

## `contest_participants`
| Policy Name | Action | Roles | Description |
| :--- | :---: | :---: | :--- |
| **read contest participants** | `SELECT` | `anon, authenticated` | Allows anyone to see who is participating in contests. |
| **contest_participants_insert_own** | `INSERT` | `authenticated` | Allows users to join a contest themselves. |
| **cp_update_own** | `UPDATE` | `authenticated` | Allows users to update their own contest participation record. |
| **contest_participants_delete_own** | `DELETE` | `authenticated` | Allows users to leave a contest. |
| **managers_all_contest_participants** | `ALL` | `authenticated` | Grants managers full access to manage all participants. |

## `contests`
| Policy Name | Action | Roles | Description |
| :--- | :---: | :---: | :--- |
| **Allow all users to view contests** | `SELECT` | `public` | Allows anyone to view the list of contests. |
| **Admins can insert own contests** | `INSERT` | `authenticated` | Allows admins to create new inactive contests. |
| **Admins can update own contests** | `UPDATE` | `authenticated` | Allows admins to edit contests they created. |
| **Admins can delete own contests** | `DELETE` | `authenticated` | Allows admins to delete contests they created. |
| **managers_all_contests** | `ALL` | `authenticated` | Grants managers full access to manage all contests. |

## `countdown_timers`
| Policy Name | Action | Roles | Description |
| :--- | :---: | :---: | :--- |
| **Users can view their own timers** | `SELECT` | `authenticated` | Allows users to see their own active countdown timers. |
| **Users can insert their own timers** | `INSERT` | `authenticated` | Allows users to start a timer when joining a contest. |
| **Users can update their own timers** | `UPDATE` | `authenticated` | Allows users to pause or update their own timers. |
| **Users can delete their own timers** | `DELETE` | `authenticated` | Allows users to delete their own timers. |
| **managers_all_countdown_timers** | `ALL` | `authenticated` | Grants managers full access to all countdown timers. |

## `join_history`
| Policy Name | Action | Roles | Description |
| :--- | :---: | :---: | :--- |
| **Users can view all join history** | `SELECT` | `authenticated` | Allows signed-in users to view contest history logs. |
| **Users can add their own join history** | `INSERT` | `authenticated` | Allows users to log when they join a contest. |
| **managers_all_join_history** | `ALL` | `authenticated` | Grants managers full access to all join history logs. |

## `managers`
| Policy Name | Action | Roles | Description |
| :--- | :---: | :---: | :--- |
| **managers_select_all** | `SELECT` | `public` | Allows all users to view their own profile, and managers to view all managers. |
| **managers_update_own** | `UPDATE` | `public` | Allows managers to update their own profile data. |

## `problems`
| Policy Name | Action | Roles | Description |
| :--- | :---: | :---: | :--- |
| **Allow all users to view problems** | `SELECT` | `public` | Allows anyone to view the list of problems. |
| **Admins can insert own problems** | `INSERT` | `authenticated` | Allows admins to create new inactive problems. |
| **Admins can update own problems** | `UPDATE` | `authenticated` | Allows admins to edit problems they created. |
| **Admins can delete own problems** | `DELETE` | `authenticated` | Allows admins to delete problems they created. |
| **managers_all_problems** | `ALL` | `authenticated` | Grants managers full access to manage all problems. |

## `submissions`
| Policy Name | Action | Roles | Description |
| :--- | :---: | :---: | :--- |
| **Allow everyone to view submissions** | `SELECT` | `anon, authenticated`| Allows anyone to view code submissions. |
| **Allow insert for authenticated** | `INSERT` | `public` | Allows logged-in users to submit code. |
| **managers_all_submissions** | `ALL` | `authenticated` | Grants managers full access to all code submissions. |

## `users`
| Policy Name | Action | Roles | Description |
| :--- | :---: | :---: | :--- |
| **users_select_all_authenticated** | `SELECT` | `public` | Allows logged-in users to view other user profiles. |
| **Users can insert own profile** | `INSERT` | `public` | Allows a user to create their initial profile during signup. |
| **Users can update own profile** | `UPDATE` | `public` | Allows users to edit their own profile settings. |
| **Users can delete own profile** | `DELETE` | `public` | Allows users to delete their own account. |
| **managers_all_users** | `ALL` | `authenticated` | Grants managers full access to manage all user profiles. |
