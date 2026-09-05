import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"

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

const uid = () => crypto.randomUUID()

interface TaskRow {
  id: string
  user_id: string
  date: string
  title: string
  done: boolean
  priority: string
  pinned: boolean
  order_index: number
  created_at: number
  completed_at: number | null
}

interface NoteRow {
  id: string
  task_id: string
  text: string
  done: boolean
  position: number
}

const taskToRow = (t: Task, userId: string) => ({
  id: t.id,
  user_id: userId,
  date: t.date,
  title: t.title,
  done: t.done,
  priority: t.priority,
  pinned: t.pinned,
  order_index: t.order,
  created_at: t.createdAt,
  completed_at: t.completedAt ?? null,
})

const noteToRow = (n: TaskNote, taskId: string, userId: string, position: number) => ({
  id: n.id,
  task_id: taskId,
  user_id: userId,
  text: n.text,
  done: n.done ?? false,
  position,
})

export function useTasks() {
  const { user } = useAuth()
  const [tasks, setTasksState] = useState<Task[]>([])

  useEffect(() => {
    if (!user) {
      setTasksState([])
      return
    }
    let alive = true
    ;(async () => {
      const [{ data: taskRows, error: tErr }, { data: noteRows, error: nErr }] =
        await Promise.all([
          supabase.from("tasks").select("*"),
          supabase.from("task_notes").select("*").order("position", { ascending: true }),
        ])
      if (!alive) return
      if (tErr || nErr) {
        console.warn("[tasks] load", tErr ?? nErr)
        return
      }
      const notesByTask = new Map<string, TaskNote[]>()
      for (const n of (noteRows ?? []) as NoteRow[]) {
        const arr = notesByTask.get(n.task_id) ?? []
        arr.push({ id: n.id, text: n.text, done: n.done })
        notesByTask.set(n.task_id, arr)
      }
      setTasksState(
        ((taskRows ?? []) as TaskRow[]).map((t) => ({
          id: t.id,
          date: t.date,
          title: t.title,
          done: t.done,
          priority: t.priority as Priority,
          pinned: t.pinned,
          notes: notesByTask.get(t.id) ?? [],
          order: t.order_index,
          createdAt: Number(t.created_at) || 0,
          completedAt: t.completed_at ?? undefined,
        })),
      )
    })()
    return () => {
      alive = false
    }
  }, [user])

  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  const setTasks = (updater: Task[] | ((prev: Task[]) => Task[])) => {
    const next =
      typeof updater === "function"
        ? (updater as (p: Task[]) => Task[])(tasksRef.current)
        : updater
    tasksRef.current = next
    setTasksState(next)
    return next
  }

  const insertTasks = (list: Task[]) => {
    if (!user || !list.length) return
    supabase
      .from("tasks")
      .insert(list.map((t) => taskToRow(t, user.id)))
      .then(({ error }) => error && console.warn("[tasks] insert", error))
    const notes = list.flatMap((t) =>
      t.notes.map((n, i) => noteToRow(n, t.id, user.id, i)),
    )
    if (notes.length) {
      supabase
        .from("task_notes")
        .insert(notes)
        .then(({ error }) => error && console.warn("[tasks] insert notes", error))
    }
  }

  const patchTask = (id: string, patch: Partial<Task>) => {
    const row: Record<string, unknown> = {}
    if (patch.title !== undefined) row.title = patch.title
    if (patch.done !== undefined) row.done = patch.done
    if (patch.priority !== undefined) row.priority = patch.priority
    if (patch.pinned !== undefined) row.pinned = patch.pinned
    if (patch.date !== undefined) row.date = patch.date
    if (patch.order !== undefined) row.order_index = patch.order
    if (patch.completedAt !== undefined) row.completed_at = patch.completedAt
    if ("completedAt" in patch && patch.completedAt === undefined)
      row.completed_at = null
    if (!Object.keys(row).length) return
    supabase
      .from("tasks")
      .update(row)
      .eq("id", id)
      .then(({ error }) => error && console.warn("[tasks] update", error))
  }

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const arr = map.get(t.date) ?? []
      arr.push(t)
      map.set(t.date, arr)
    }
    for (const arr of map.values())
      arr.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
    return map
  }, [tasks])

  const forDate = (date: string) => byDate.get(date) ?? []

  const nextOrder = (date: string) => {
    const list = byDate.get(date) ?? []
    return list.length ? Math.max(...list.map((t) => t.order)) + 1 : 0
  }

  const addTask = (
    date: string,
    title: string,
    priority: Priority = "med",
    notes: string[] = [],
  ) => {
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
    insertTasks([created])
  }

  /**
   * Bulk add. Lines beginning with "-" or "*" attach as notes to the previous task.
   * Prefix "!" = high priority, "~" = low priority.
   */
  const bulkAdd = (date: string, text: string) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
    if (!lines.length) return 0
    const created: Task[] = []
    let base = nextOrder(date)
    for (const line of lines) {
      if (/^[-*•]\s*/.test(line) && created.length) {
        created[created.length - 1].notes.push({
          id: uid(),
          text: line.replace(/^[-*•]\s*/, ""),
        })
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
      insertTasks(created)
    }
    return created.length
  }

  const updateTask = (id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    patchTask(id, patch)
  }

  const toggle = (id: string) => {
    const current = tasksRef.current.find((t) => t.id === id)
    if (!current) return
    const patch = {
      done: !current.done,
      completedAt: !current.done ? Date.now() : undefined,
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    )
    patchTask(id, patch)
  }

  const remove = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .then(({ error }) => error && console.warn("[tasks] remove", error))
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
    setTasks((prev) =>
      prev.map((t) =>
        t.id === a.id
          ? { ...t, order: b.order }
          : t.id === b.id
            ? { ...t, order: a.order }
            : t,
      ),
    )
    patchTask(a.id, { order: b.order })
    patchTask(b.id, { order: a.order })
  }

  const moveToDate = (id: string, date: string) => {
    const list = tasksRef.current.filter((t) => t.date === date)
    const order = list.length ? Math.max(...list.map((t) => t.order)) + 1 : 0
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, date, order } : t)),
    )
    patchTask(id, { date, order })
  }

  const addNote = (id: string, text: string) => {
    const v = text.trim()
    if (!v || !user) return
    const task = tasksRef.current.find((t) => t.id === id)
    const note: TaskNote = { id: uid(), text: v }
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, notes: [...t.notes, note] } : t)),
    )
    supabase
      .from("task_notes")
      .insert(noteToRow(note, id, user.id, task?.notes.length ?? 0))
      .then(({ error }) => error && console.warn("[tasks] add note", error))
  }

  const updateNote = (id: string, noteId: string, text: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              notes: t.notes.map((n) => (n.id === noteId ? { ...n, text } : n)),
            }
          : t,
      ),
    )
    supabase
      .from("task_notes")
      .update({ text })
      .eq("id", noteId)
      .then(({ error }) => error && console.warn("[tasks] update note", error))
  }

  const removeNote = (id: string, noteId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, notes: t.notes.filter((n) => n.id !== noteId) }
          : t,
      ),
    )
    supabase
      .from("task_notes")
      .delete()
      .eq("id", noteId)
      .then(({ error }) => error && console.warn("[tasks] remove note", error))
  }

  /** Clone helper: copy picked tasks into target date as fresh active tasks. */
  const cloneTasks = (source: Task[], to: string) => {
    const existing = new Set(
      (byDate.get(to) ?? []).map((t) => t.title.toLowerCase()),
    )
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
    insertTasks(clones)
    return clones.length
  }

  /** Copy unfinished (and/or pinned/routine) tasks from a source day into target day. */
  const carryOver = (
    from: string,
    to: string,
    opts: { unfinished?: boolean; pinned?: boolean } = {
      unfinished: true,
      pinned: true,
    },
  ) => {
    const source = (byDate.get(from) ?? []).filter(
      (t) => (opts.unfinished && !t.done) || (opts.pinned && t.pinned),
    )
    if (!source.length) return 0
    return cloneTasks(source, to)
  }

  /** Clone every task from a source day into target day, resetting all tasks to active. */
  const cloneFromDate = (from: string, to: string) => {
    const source = byDate.get(from) ?? []
    if (!source.length) return 0
    return cloneTasks(source, to)
  }

  const clearCompleted = (date: string) => {
    const done = tasksRef.current.filter((t) => t.date === date && t.done)
    setTasks((prev) => prev.filter((t) => !(t.date === date && t.done)))
    if (done.length) {
      supabase
        .from("tasks")
        .delete()
        .eq("date", date)
        .eq("done", true)
        .then(({ error }) =>
          error && console.warn("[tasks] clear completed", error),
        )
    }
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
