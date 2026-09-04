# Daily Flow — API Contract

Base URL: `VITE_API_BASE_URL` (mặc định `http://localhost:3000`)
Bật/tắt backend: `VITE_USE_API=true|false` trong `.env` (false = dùng localStorage như cũ).

Quy ước chung:
- Content-Type: `application/json`
- Client sinh sẵn `id` (UUID) cho mọi resource khi tạo mới → backend chỉ cần upsert theo `id`.
- Trả `200` kèm JSON, hoặc `204` không body. Lỗi trả text/JSON bất kỳ (client ném `ApiError`).
- Client (`src/lib/api.ts`) gọi ghi theo kiểu fire-and-forget: UI cập nhật optimistic, lỗi chỉ log.

---

## 1. App state (key/value) — `src/lib/persistence.ts`

Dùng cho settings + runtime của timer.

| Method | URL | Body | Response |
|---|---|---|---|
| GET | `/api/state/:key` | – | `{ "value": any } \| null` |
| PUT | `/api/state/:key` | `{ "value": any }` | `204` hoặc `{ value }` |

Các `key` đang dùng:

| Key | Nơi dùng | Kiểu value |
|---|---|---|
| `pomodoro.config.v1` | `PomodoroTimer.tsx` | `{ work:number, short_break:number, long_break:number, sessions_before_long:number, autoStart:boolean }` (giây) |
| `pomodoro.runtime.v1` | `PomodoroTimer.tsx` | `{ mode:"work"\|"short_break"\|"long_break", timeLeft:number, isRunning:boolean, endAt:number\|null, completedSessions:number }` |
| `eye.focusMin` | `EyeCare.tsx` | `number` (phút) |
| `eye.restSec` | `EyeCare.tsx` | `number` (giây) |
| `eye.runtime.v1` | `EyeCare.tsx` | `{ phase:"focus"\|"rest", timeLeft:number, isRunning:boolean, endAt:number\|null, cycles:number }` |

---

## 2. Schedule blocks — `src/hooks/useSchedule.ts` (trang Schedule)

Model `ScheduleBlock`:
```ts
{
  id: string
  start: string            // "07:30"
  end: string | null       // null = block cuối ngày
  title: string
  category: "personal"|"growth"|"work"|"recovery"|"business"|"health"|"learning"|"work-flex"|"reflection"
  description: string
  energy_level: "warm_up"|"peak"|"high"|"medium_high"|"medium"|"low"|"active"|"cooldown"|"recovery"|"sleep_prep"|"restore"
  focus_type: "none"|"deep"|"focused"|"creative"|"body"|"learning"|"reactive"|"light"
  task_style?: string
}
```

| Method | URL | Body / Param | Mô tả |
|---|---|---|---|
| GET | `/api/schedule-blocks` | – | Trả mảng block theo thứ tự hiển thị (hydrate khi mở trang) |
| POST | `/api/schedule-blocks` | `ScheduleBlock` đầy đủ (đã có `id`) | Thêm block |
| PATCH | `/api/schedule-blocks/:id` | `ScheduleBlock` (partial/đầy đủ) | Sửa block |
| DELETE | `/api/schedule-blocks/:id` | – | Xoá block |
| PUT | `/api/schedule-blocks/reorder` | `{ orderedIds: string[] }` | Lưu thứ tự sau khi thêm hoặc di chuyển lên/xuống |
| POST | `/api/schedule-blocks/reset` | `{}` | Reset về lịch mặc định, **trả về mảng `ScheduleBlock[]` mới** |

---

## 3. Tasks (Daily Task Planner) — `src/hooks/useTasks.ts` (trang Tasks)

Model `Task`:
```ts
{
  id: string
  date: string        // "YYYY-MM-DD" theo UTC+7
  title: string
  done: boolean
  priority: "low" | "med" | "high"
  pinned: boolean     // routine
  notes: { id: string, text: string, done?: boolean }[]
  order: number       // thứ tự trong ngày
  createdAt: number   // epoch ms
  completedAt?: number
}
```

| Method | URL | Body / Param | Nơi dùng |
|---|---|---|---|
| GET | `/api/tasks` | – | Hydrate toàn bộ task (client tự group theo `date`) |
| POST | `/api/tasks` | `Task` đầy đủ | Quick add |
| POST | `/api/tasks/bulk` | `{ date: string, tasks: Task[] }` | Bulk add (modal nhiều dòng) |
| PATCH | `/api/tasks/:id` | `Partial<Task>` | Sửa title/priority/pin/order/date; toggle done gửi kèm `{ done, completedAt: number\|null }` |
| DELETE | `/api/tasks/:id` | – | Xoá task |
| PUT | `/api/tasks/reorder` | `{ date: string, orderedIds: string[] }` | Di chuyển task lên/xuống trong ngày |
| POST | `/api/tasks/carry-over` | `{ from: string, to: string, options: { includeUnfinished?: boolean, includePinned?: boolean }, tasks: Task[] }` | Nút *Carry over* (chỉ task chưa xong / pinned). `tasks` là bản clone client đã tạo sẵn |
| POST | `/api/tasks/clone` | `{ from: string, to: string, tasks: Task[] }` | Nút *Clone from Yesterday* (clone toàn bộ, reset `done=false`) |
| POST | `/api/tasks/clear-completed` | `{ date: string }` | Xoá mọi task đã hoàn thành trong ngày |

Notes của task:

| Method | URL | Body |
|---|---|---|
| POST | `/api/tasks/:id/notes` | `{ id: string, text: string }` |
| PATCH | `/api/tasks/:taskId/notes/:noteId` | `{ text: string }` |
| DELETE | `/api/tasks/:taskId/notes/:noteId` | – |

Ghi chú nghiệp vụ: ngày quá khứ bị khoá phía UI (không add/bulk/carry-over/clone), nhưng vẫn sửa/xoá/tick task cũ — backend nên cho phép các thao tác edit này.

---

## 4. Notes — `src/hooks/useNotes.ts` (trang Notes)

Model `Note`: `{ id: string, title: string, body: string, updatedAt: number }`

| Method | URL | Body |
|---|---|---|
| GET | `/api/notes` | – (trả `Note[]`, client hiển thị theo thứ tự nhận được, mới nhất trước) |
| POST | `/api/notes` | `Note` đầy đủ (`title: "Untitled"`, `body: ""`) |
| PATCH | `/api/notes/:id` | `{ title?, body?, updatedAt }` |
| DELETE | `/api/notes/:id` | – |

---

## 5. Bật backend

```bash
# .env
VITE_USE_API=true
VITE_API_BASE_URL=http://localhost:3000
```
Backend cần bật CORS cho origin của Vite (`http://localhost:8080`).
