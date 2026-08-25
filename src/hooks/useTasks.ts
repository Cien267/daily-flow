import { useMemo } from "react"
import { useLocalStorage } from "@/lib/useLocalStorage"

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
      id: t.id ?? crypto.randomUUID(),
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

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()))

export function useTasks() {
  const [tasks, setTasks] = useLocalStorage<Task[]>(KEY, migrateLegacy())

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
    setTasks((prev) => {
      const list = prev.filter((t) => t.date === date)
      const order = list.length ? Math.max(...list.map((t) => t.order)) + 1 : 0
      return [
        ...prev,
        {
          id: uid(),
          date,
          title: trimmed,
          done: false,
          priority,
          pinned: false,
          notes: notes.filter(Boolean).map((n) => ({ id: uid(), text: n })),
          order,
          createdAt: Date.now(),
        },
      ]
    })
  }

  /**
   * Bulk add. Lines beginning with "-" or "*" attach as notes to the previous task.
   * Prefix "!" = high priority, "~" = low priority. Trailing "!" also works.
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
    if (created.length) setTasks((prev) => [...prev, ...created])
    return created.length
  }

  const updateTask = (id: string, patch: Partial<Task>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const toggle = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined } : t)),
    )

  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id))

  const move = (id: string, dir: -1 | 1) =>
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id)
      if (!task) return prev
      const list = prev
        .filter((t) => t.date === task.date)
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
      const i = list.findIndex((t) => t.id === id)
      const j = i + dir
      if (j < 0 || j >= list.length) return prev
      const a = list[i]
      const b = list[j]
      return prev.map((t) => (t.id === a.id ? { ...t, order: b.order } : t.id === b.id ? { ...t, order: a.order } : t))
    })

  const moveToDate = (id: string, date: string) =>
    setTasks((prev) => {
      const list = prev.filter((t) => t.date === date)
      const order = list.length ? Math.max(...list.map((t) => t.order)) + 1 : 0
      return prev.map((t) => (t.id === id ? { ...t, date, order } : t))
    })

  const addNote = (id: string, text: string) => {
    const v = text.trim()
    if (!v) return
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, notes: [...t.notes, { id: uid(), text: v }] } : t)))
  }

  const updateNote = (id: string, noteId: string, text: string) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, notes: t.notes.map((n) => (n.id === noteId ? { ...n, text } : n)) } : t,
      ),
    )

  const removeNote = (id: string, noteId: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, notes: t.notes.filter((n) => n.id !== noteId) } : t)))

  /** Copy unfinished (and/or pinned/routine) tasks from a source day into target day. */
  const carryOver = (from: string, to: string, opts: { unfinished?: boolean; pinned?: boolean } = { unfinished: true, pinned: true }) => {
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
    return clones.length
  }

  const clearCompleted = (date: string) => setTasks((prev) => prev.filter((t) => !(t.date === date && t.done)))

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
    clearCompleted,
  }
}
