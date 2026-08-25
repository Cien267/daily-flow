import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Plus, CalendarDays, CopyPlus, ListPlus, Eraser, Flag } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import TaskItem from "@/components/TaskItem"
import {
  useTasks, todayKey, shiftDate, formatDayLabel, formatDaySub, Priority,
} from "@/hooks/useTasks"

const pColor: Record<Priority, string> = {
  low: "text-muted-foreground",
  med: "text-yellow-500",
  high: "text-red-500",
}

export default function Tasks() {
  const t = useTasks()
  const [date, setDate] = useState(todayKey())
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<Priority>("med")
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulk, setBulk] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "done">("all")

  const dayTasks = t.forDate(date)
  const visible = dayTasks.filter((x) => (filter === "all" ? true : filter === "active" ? !x.done : x.done))
  const doneCount = dayTasks.filter((x) => x.done).length
  const progress = dayTasks.length ? Math.round((doneCount / dayTasks.length) * 100) : 0

  const recentDays = useMemo(
    () => t.activeDates.filter((d) => d !== date).slice(0, 6),
    [t.activeDates, date],
  )

  const submitAdd = () => {
    if (!title.trim()) return
    if (title.includes("\n")) t.bulkAdd(date, title)
    else t.addTask(date, title, priority)
    setTitle("")
  }

  const submitBulk = () => {
    const n = t.bulkAdd(date, bulk)
    if (n) toast.success(`Added ${n} task${n > 1 ? "s" : ""}`)
    setBulk("")
    setBulkOpen(false)
  }

  const doCarry = () => {
    const from = shiftDate(date, -1)
    const n = t.carryOver(from, date)
    toast[n ? "success" : "info"](
      n ? `Carried over ${n} task${n > 1 ? "s" : ""} from ${formatDayLabel(from)}` : "Nothing to carry over",
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-14">
      {/* Day header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{formatDayLabel(date)}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{formatDaySub(date)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setDate(shiftDate(date, -1))} title="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDate(todayKey())} disabled={date === todayKey()}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDate(shiftDate(date, 1))} title="Next day">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <label className="relative inline-flex cursor-pointer items-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" title="Pick a date">
              <CalendarDays className="h-4 w-4" />
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {doneCount}/{dayTasks.length}
          </span>
        </div>
      </div>

      {/* Quick add */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a task for this day…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitAdd()}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text")
            if (text.includes("\n")) {
              e.preventDefault()
              const n = t.bulkAdd(date, text)
              if (n) toast.success(`Added ${n} tasks`)
            }
          }}
        />
        <button
          onClick={() => setPriority(priority === "low" ? "med" : priority === "med" ? "high" : "low")}
          className={`rounded-md border border-border px-3 ${pColor[priority]}`}
          title={`Priority: ${priority}`}
        >
          <Flag className="h-4 w-4" />
        </button>
        <Button onClick={submitAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={doCarry}>
          <CopyPlus className="h-3.5 w-3.5" /> Carry over from {formatDayLabel(shiftDate(date, -1))}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setBulkOpen((v) => !v)}>
          <ListPlus className="h-3.5 w-3.5" /> Bulk add
        </Button>
        {doneCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => t.clearCompleted(date)}>
            <Eraser className="h-3.5 w-3.5" /> Clear done
          </Button>
        )}
      </div>

      {bulkOpen && (
        <div className="mt-3 rounded-lg border border-border bg-card p-3">
          <Textarea
            autoFocus
            rows={6}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitBulk()
            }}
            placeholder={"One task per line\n! prefix = high priority, ~ = low\n- indented lines become notes of the task above"}
            className="resize-y font-mono text-xs"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter to add</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setBulk(""); setBulkOpen(false) }}>Cancel</Button>
              <Button size="sm" onClick={submitBulk}>Add all</Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-3 mt-5 flex gap-1 text-xs">
        {(["all", "active", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-2.5 py-1 capitalize ${
              filter === f ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <ul className="space-y-1.5">
        {visible.length === 0 && (
          <li className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Nothing here yet — add a task or carry over from a previous day.
          </li>
        )}
        {visible.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => t.toggle(task.id)}
            onRemove={() => t.remove(task.id)}
            onMove={(dir) => t.move(task.id, dir)}
            onUpdate={(patch) => t.updateTask(task.id, patch)}
            onAddNote={(text) => t.addNote(task.id, text)}
            onUpdateNote={(nid, text) => t.updateNote(task.id, nid, text)}
            onRemoveNote={(nid) => t.removeNote(task.id, nid)}
          />
        ))}
      </ul>

      {/* Other days */}
      {recentDays.length > 0 && (
        <div className="mt-10 border-t border-border pt-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Other days</h2>
          <div className="space-y-1">
            {recentDays.map((d) => {
              const list = t.forDate(d)
              const done = list.filter((x) => x.done).length
              return (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <span>{formatDayLabel(d)}</span>
                  <span className="font-mono text-xs">
                    {done}/{list.length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
