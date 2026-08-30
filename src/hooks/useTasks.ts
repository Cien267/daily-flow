import { useEffect, useMemo, useRef, useState } from "react"
import { API_ENABLED, api, silent, uid } from "@/lib/api"
import { readLocal, saveState } from "@/lib/persistence"

export type Priority = "low" | "med" | "high"

export interface TaskNote {
  id: string
  text: string
  done?: boolean
}

export interface Task {
  id: string
  /** YYYY-MM-DD in UTC+7 */
  date: string
  title: string
  done: boolean
  priority: Priority
  pinned: boolean
  notes: TaskNote[]
  order: number
  createdAt: number
  completedAt?: number
}

const KEY = "tasks.v2"
const LEGACY_KEY = "tasks.v1"

export function todayKey(): string {
  const now = new Date()
  const utc7 = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return utc7.toISOString().slice(0, 10)
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatDayLabel(date: string): string {
  const t = todayKey()
  if (date === t) return "Today"
  if (date === shiftDate(t, 1)) return "Tomorrow"
  if (date === shiftDate(t, -1)) return "Yesterday"
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

export function formatDaySub(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

function migrateLegacy(): Task[] {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY)
    if (!raw) return []
    const old = JSON.parse(raw) as Array<{ id: string; title: string; done: boolean; priority: Priority; createdAt: number }>
    const d = todayKey()
    return old.map((t, i) => ({
      id: t.id ?? uid(),
      date: d,
      title: t.title,
      done: !!t.done,
      priority: t.priority ?? "med",
      pinned: false,
      notes: [],
      order: i,
      createdAt: t.createdAt ?? Date.now(),
    }))
  } catch {
    return []
  }
}

export function useTasks() {
  const [tasks, setTasksState] = useState<Task[]>(() =>
    API_ENABLED ? [] : readLocal<Task[]>(KEY, migrateLegacy()),
  )

  useEffect(() => {
    if (!API_ENABLED) return
    let alive = true
    api
      .get<Task[]>("/api/tasks")
      .then((list) => alive && setTasksState(list ?? []))
      .catch((e) => console.warn("[api] tasks", e))
    return () => {
      alive = false
    }
  }, [])

  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  const setTasks = (updater: Task[] | ((prev: Task[]) => Task[])) => {
    const next = typeof updater === "function" ? (updater as (p: Task[]) => Task[])(tasksRef.current) : updater
    tasksRef.current = next
    setTasksState(next)
    if (!API_ENABLED) saveState(KEY, next)
    return next
  }

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const arr = map.get(t.date) ?? []
      arr.push(t)
      map.set(t.date, arr)
    }
    for (const arr of map.values()) arr.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
    return map
  }, [tasks])

  const forDate = (date: string) => byDate.get(date) ?? []

  const nextOrder = (date: string) => {
    const list = byDate.get(date) ?? []
    return list.length ? Math.max(...list.map((t) => t.order)) + 1 : 0
  }

  const addTask = (date: string, title: string, priority: Priority = "med", notes: string[] = []) => {
    const trimmed = title.trim()
    if (!trimmed) return
    const list = tasksRef.current.filter((t) => t.date === date)
    const created: Task = {
      id: uid(),
      date,
      title: trimmed,
      done: false,
      priority,
      pinned: false,
      notes: notes.filter(Boolean).map((n) => ({ id: uid(), text: n })),
      order: list.length ? Math.max(...list.map((t) => t.order)) + 1 : 0,
      createdAt: Date.now(),
    }
    setTasks((prev) => [...prev, created])
    if (API_ENABLED) silent(api.post("/api/tasks", created))
  }

  /**
   * Bulk add. Lines beginning with "-" or "*" attach as notes to the previous task.
   * Prefix "!" = high priority, "~" = low priority.
   */
  const bulkAdd = (date: string, text: string) => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return 0
    const created: Task[] = []
    let base = nextOrder(date)
    for (const line of lines) {
      if (/^[-*•]\s*/.test(line) && created.length) {
        created[created.length - 1].notes.push({ id: uid(), text: line.replace(/^[-*•]\s*/, "") })
        continue
      }
      let title = line.replace(/^[-*•]\s*/, "")
      let priority: Priority = "med"
      if (title.startsWith("!")) {
        priority = "high"
        title = title.slice(1).trim()
      } else if (title.startsWith("~")) {
        priority = "low"
        title = title.slice(1).trim()
      }
      if (!title) continue
      created.push({
        id: uid(),
        date,
        title,
        done: false,
        priority,
        pinned: false,
        notes: [],
        order: base++,
        createdAt: Date.now(),
      })
    }
    if (created.length) {
      setTasks((prev) => [...prev, ...created])
      if (API_ENABLED) silent(api.post("/api/tasks/bulk", { date, tasks: created }))
    }
    return created.length
  }

  const updateTask = (id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    if (API_ENABLED) silent(api.patch(`/api/tasks/${id}`, patch))
  }

  const toggle = (id: string) => {
    const current = tasksRef.current.find((t) => t.id === id)
    if (!current) return
    const patch = { done: !current.done, completedAt: !current.done ? Date.now() : undefined }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    if (API_ENABLED) silent(api.patch(`/api/tasks/${id}`, { ...patch, completedAt: patch.completedAt ?? null }))
  }

  const remove = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    if (API_ENABLED) silent(api.del(`/api/tasks/${id}`))
  }

  const move = (id: string, dir: -1 | 1) => {
    const task = tasksRef.current.find((t) => t.id === id)
    if (!task) return
    const list = tasksRef.current
      .filter((t) => t.date === task.date)
      .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
    const i = list.findIndex((t) => t.id === id)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const a = list[i]
    const b = list[j]
    const next = setTasks((prev) =>
      prev.map((t) => (t.id === a.id ? { ...t, order: b.order } : t.id === b.id ? { ...t, order: a.order } : t)),
    )
    if (API_ENABLED) {
      const orderedIds = next
        .filter((t) => t.date === task.date)
        .sort((x, y) => x.order - y.order || x.createdAt - y.createdAt)
        .map((t) => t.id)
      silent(api.put("/api/tasks/reorder", { date: task.date, orderedIds }))
    }
  }

  const moveToDate = (id: string, date: string) => {
    const list = tasksRef.current.filter((t) => t.date === date)
    const order = list.length ? Math.max(...list.map((t) => t.order)) + 1 : 0
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, date, order } : t)))
    if (API_ENABLED) silent(api.patch(`/api/tasks/${id}`, { date, order }))
  }

  const addNote = (id: string, text: string) => {
    const v = text.trim()
    if (!v) return
    const note: TaskNote = { id: uid(), text: v }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, notes: [...t.notes, note] } : t)))
    if (API_ENABLED) silent(api.post(`/api/tasks/${id}/notes`, note))
  }

  const updateNote = (id: string, noteId: string, text: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, notes: t.notes.map((n) => (n.id === noteId ? { ...n, text } : n)) } : t,
      ),
    )
    if (API_ENABLED) silent(api.patch(`/api/tasks/${id}/notes/${noteId}`, { text }))
  }

  const removeNote = (id: string, noteId: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, notes: t.notes.filter((n) => n.id !== noteId) } : t)))
    if (API_ENABLED) silent(api.del(`/api/tasks/${id}/notes/${noteId}`))
  }

  /** Copy unfinished (and/or pinned/routine) tasks from a source day into target day. */
  const carryOver = (
    from: string,
    to: string,
    opts: { unfinished?: boolean; pinned?: boolean } = { unfinished: true, pinned: true },
  ) => {
    const source = (byDate.get(from) ?? []).filter(
      (t) => (opts.unfinished && !t.done) || (opts.pinned && t.pinned),
    )
    if (!source.length) return 0
    const existing = new Set((byDate.get(to) ?? []).map((t) => t.title.toLowerCase()))
    const picked = source.filter((t) => !existing.has(t.title.toLowerCase()))
    if (!picked.length) return 0
    let base = nextOrder(to)
    const clones: Task[] = picked.map((t) => ({
      ...t,
      id: uid(),
      date: to,
      done: false,
      completedAt: undefined,
      notes: t.notes.map((n) => ({ ...n, id: uid() })),
      order: base++,
      createdAt: Date.now(),
    }))
    setTasks((prev) => [...prev, ...clones])
    if (API_ENABLED) silent(api.post("/api/tasks/carry-over", { from, to, options: opts, tasks: clones }))
    return clones.length
  }

  /** Clone every task from a source day into target day, resetting all tasks to active. */
  const cloneFromDate = (from: string, to: string) => {
    const source = byDate.get(from) ?? []
    if (!source.length) return 0
    const existing = new Set((byDate.get(to) ?? []).map((t) => t.title.toLowerCase()))
    const picked = source.filter((t) => !existing.has(t.title.toLowerCase()))
    if (!picked.length) return 0
    let base = nextOrder(to)
    const clones: Task[] = picked.map((t) => ({
      ...t,
      id: uid(),
      date: to,
      done: false,
      completedAt: undefined,
      notes: t.notes.map((n) => ({ ...n, id: uid() })),
      order: base++,
      createdAt: Date.now(),
    }))
    setTasks((prev) => [...prev, ...clones])
    if (API_ENABLED) silent(api.post("/api/tasks/clone", { from, to, tasks: clones }))
    return clones.length
  }

  const clearCompleted = (date: string) => {
    setTasks((prev) => prev.filter((t) => !(t.date === date && t.done)))
    if (API_ENABLED) silent(api.post("/api/tasks/clear-completed", { date }))
  }

  const activeDates = useMemo(
    () => Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a)),
    [byDate],
  )

  return {
    tasks,
    forDate,
    byDate,
    activeDates,
    addTask,
    bulkAdd,
    updateTask,
    toggle,
    remove,
    move,
    moveToDate,
    addNote,
    updateNote,
    removeNote,
    carryOver,
    cloneFromDate,
    clearCompleted,
  }
}
