# Database Row Level Security (RLS) Policies

This document outlines the Row Level Security (RLS) policies active on the Supabase PostgreSQL database for each table in the `public` schema.

## `admins`
| Policy Name | Action | Roles | condition (`qual`) / `with_check` |
| :--- | :---: | :---: | :--- |
| **Admins can view all admins** | `SELECT` | `public` | `is_admin()` |
| **managers_all_admins** | `ALL` | `authenticated` | Manager override |

## `contest_participants`
| Policy Name | Action | Roles | condition (`qual`) / `with_check` |
| :--- | :---: | :---: | :--- |
| **read contest participants** | `SELECT` | `anon, authenticated` | `true` |
| **contest_participants_insert_own** | `INSERT` | `authenticated` | `(auth.uid() = user_id)` (with_check) |
| **cp_update_own** | `UPDATE` | `authenticated` | `(auth.uid() = user_id)` |
| **contest_participants_delete_own** | `DELETE` | `authenticated` | `(auth.uid() = user_id)` |
| **managers_all_contest_participants** | `ALL` | `authenticated` | Manager override |

## `contests`
| Policy Name | Action | Roles | condition (`qual`) / `with_check` |
| :--- | :---: | :---: | :--- |
| **Allow all users to view contests** | `SELECT` | `public` | `true` |
| **Admins can insert own contests** | `INSERT` | `authenticated` | `auth.uid() in admins AND created_by = auth.uid() AND is_active = false` (with_check) |
| **Admins can update own contests** | `UPDATE` | `authenticated` | `auth.uid() in admins AND created_by = auth.uid()` |
| **Admins can delete own contests** | `DELETE` | `authenticated` | `auth.uid() in admins AND created_by = auth.uid()` |
| **managers_all_contests** | `ALL` | `authenticated` | Manager override |

## `countdown_timers`
| Policy Name | Action | Roles | condition (`qual`) / `with_check` |
| :--- | :---: | :---: | :--- |
| **Users can view their own timers** | `SELECT` | `authenticated` | `(auth.uid() = user_id)` |
| **Users can insert their own timers** | `INSERT` | `authenticated` | `(auth.uid() = user_id)` (with_check) |
| **Users can update their own timers** | `UPDATE` | `authenticated` | `(auth.uid() = user_id)` |
| **Users can delete their own timers** | `DELETE` | `authenticated` | `(auth.uid() = user_id)` |
| **managers_all_countdown_timers** | `ALL` | `authenticated` | Manager override |

## `join_history`
| Policy Name | Action | Roles | condition (`qual`) / `with_check` |
| :--- | :---: | :---: | :--- |
| **Users can view all join history** | `SELECT` | `authenticated` | `true` |
| **Users can add their own join history** | `INSERT` | `authenticated` | `(auth.uid() = user_id)` (with_check) |
| **managers_all_join_history** | `ALL` | `authenticated` | Manager override |

## `managers`
| Policy Name | Action | Roles | condition (`qual`) / `with_check` |
| :--- | :---: | :---: | :--- |
| **managers_select_all** | `SELECT` | `public` | `((auth.uid() = id) OR is_manager())` |
| **managers_update_own** | `UPDATE` | `public` | `(auth.uid() = id)` |

## `problems`
| Policy Name | Action | Roles | condition (`qual`) / `with_check` |
| :--- | :---: | :---: | :--- |
| **Allow all users to view problems** | `SELECT` | `public` | `true` |
| **Admins can insert own problems** | `INSERT` | `authenticated` | `auth.uid() in admins AND created_by = auth.uid() AND is_active = false` (with_check) |
| **Admins can update own problems** | `UPDATE` | `authenticated` | `auth.uid() in admins AND created_by = auth.uid()` |
| **Admins can delete own problems** | `DELETE` | `authenticated` | `auth.uid() in admins AND created_by = auth.uid()` |
| **managers_all_problems** | `ALL` | `authenticated` | Manager override |

## `submissions`
| Policy Name | Action | Roles | condition (`qual`) / `with_check` |
| :--- | :---: | :---: | :--- |
| **Allow everyone to view submissions** | `SELECT` | `anon, authenticated`| `true` |
| **Allow insert for authenticated** | `INSERT` | `public` | `true` (with_check) |
| **managers_all_submissions** | `ALL` | `authenticated` | Manager override |

## `users`
| Policy Name | Action | Roles | condition (`qual`) / `with_check` |
| :--- | :---: | :---: | :--- |
| **users_select_all_authenticated** | `SELECT` | `public` | `(auth.uid() IS NOT NULL)` |
| **Users can insert own profile** | `INSERT` | `public` | `(auth.uid() = id)` (with_check) |
| **Users can update own profile** | `UPDATE` | `public` | `(auth.uid() = id)` |
| **Users can delete own profile** | `DELETE` | `public` | `(auth.uid() = id)` |
| **managers_all_users** | `ALL` | `authenticated` | Manager override |
