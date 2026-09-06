# Daily Flow — Backend (Lovable Cloud)

The app no longer calls a custom REST API. All data lives in the managed
cloud database and is queried directly from the client with the generated
client (`@/integrations/supabase/client`). Every table is protected by
row-level security, so a signed-in account can only read/write its own rows.

## Auth

- Email + password sign in / sign up (`src/pages/Auth.tsx`).
- Session state: `src/hooks/useAuth.tsx` (`AuthProvider`, `useAuth`).
- All app routes are protected in `src/App.tsx`; unauthenticated visitors are
  redirected to `/auth`.
- On sign-up a row in `profiles` is created automatically by a database trigger.

## Tables

| Table | Purpose | Used by |
| --- | --- | --- |
| `profiles` | display name per account | auth trigger |
| `schedule_blocks` | daily timeline blocks (`title`, `start_time`, `end_time`, `category`, `energy_level`, `focus_type`, `task_style`, `description`, `position`) | `src/hooks/useSchedule.ts` |
| `tasks` | day-based tasks (`date`, `title`, `done`, `priority`, `pinned`, `order_index`, `created_at`, `completed_at`) | `src/hooks/useTasks.ts` |
| `task_notes` | bullet notes under a task (`task_id`, `text`, `done`, `position`) | `src/hooks/useTasks.ts` |
| `notes` | standalone notes (`title`, `body`, `updated_at`) | `src/hooks/useNotes.ts` |
| `app_state` | per-user key/value JSON (Pomodoro + Eye Care config and runtime) | `src/lib/persistence.ts` |

## Persistence behaviour

- Hooks apply optimistic updates locally and write to the database in the
  background; failures are logged, never thrown into the UI.
- `app_state` writes are debounced 400 ms per key so the running timers do not
  spam the database.
- Timers persist an absolute `endAt` deadline, so reloading or switching pages
  keeps the countdown accurate.
- Task rules unchanged: past days are read-only for creation/copy actions
  (quick add, bulk add, carry over, clone), while existing tasks stay editable.
