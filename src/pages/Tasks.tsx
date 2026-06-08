import { useState } from "react"
import { Plus, Trash2, Flag } from "lucide-react"
import { useLocalStorage } from "@/lib/useLocalStorage"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type Priority = "low" | "med" | "high"
interface Task { id: string; title: string; done: boolean; priority: Priority; createdAt: number }

const pColor: Record<Priority, string> = {
  low: "text-muted-foreground",
  med: "text-yellow-500",
  high: "text-red-500",
}

export default function Tasks() {
  const [tasks, setTasks] = useLocalStorage<Task[]>("tasks.v1", [])
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<Priority>("med")
  const [filter, setFilter] = useState<"all" | "active" | "done">("all")

  const add = () => {
    if (!title.trim()) return
    setTasks([{ id: crypto.randomUUID(), title: title.trim(), done: false, priority, createdAt: Date.now() }, ...tasks])
    setTitle("")
  }
  const toggle = (id: string) => setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const remove = (id: string) => setTasks(tasks.filter((t) => t.id !== id))
  const cyclePriority = (id: string) => {
    const order: Priority[] = ["low", "med", "high"]
    setTasks(tasks.map((t) => t.id === id ? { ...t, priority: order[(order.indexOf(t.priority) + 1) % 3] } : t))
  }

  const visible = tasks.filter((t) => filter === "all" ? true : filter === "active" ? !t.done : t.done)
  const remaining = tasks.filter((t) => !t.done).length

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-14">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">{remaining} remaining · {tasks.length} total</p>
      </div>

      <div className="flex gap-2 mb-4">
        <Input placeholder="What needs doing?" value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={() => setPriority(priority === "low" ? "med" : priority === "med" ? "high" : "low")}
          className={`rounded-md border border-border px-3 ${pColor[priority]}`} title="Priority">
          <Flag className="h-4 w-4" />
        </button>
        <Button onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>

      <div className="flex gap-1 mb-3 text-xs">
        {(["all", "active", "done"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-md px-2.5 py-1 capitalize ${filter === f ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {f}
          </button>
        ))}
      </div>

      <ul className="space-y-1">
        {visible.length === 0 && <li className="text-center text-sm text-muted-foreground py-8">No tasks</li>}
        {visible.map((t) => (
          <li key={t.id} className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-muted-foreground/20">
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)}
              className="h-4 w-4 accent-primary" />
            <button onClick={() => cyclePriority(t.id)} className={pColor[t.priority]} title={`Priority: ${t.priority}`}>
              <Flag className="h-3.5 w-3.5" />
            </button>
            <span className={`flex-1 text-sm ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</span>
            <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
