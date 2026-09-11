import { useState, useEffect, useRef } from "react"
import { Trash2, Flag, ArrowUp, ArrowDown, Plus, Pin, CornerDownRight, X } from "lucide-react"
import { Task, Priority } from "@/hooks/useTasks"

const pColor: Record<Priority, string> = {
  low: "text-muted-foreground",
  med: "text-yellow-500",
  high: "text-red-500",
}

/**
 * Input that keeps a local draft while typing and only commits the value
 * after 600ms of inactivity (or on blur). Prevents per-keystroke API calls
 * from hijacking the caret and breaking Vietnamese IME composition.
 */
function DebouncedInput({
  value,
  onCommit,
  className,
  placeholder,
  autoFocus,
  onKeyDown,
  onBlur,
}: {
  value: string
  onCommit: (v: string) => void
  className?: string
  placeholder?: string
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onBlur?: () => void
}) {
  const [draft, setDraft] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirty = useRef(false)

  // Sync external value in only while the user isn't editing
  useEffect(() => {
    if (!dirty.current) setDraft(value)
  }, [value])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const flush = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (dirty.current) { dirty.current = false; onCommit(draft) }
  }

  return (
    <input
      value={draft}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => {
        const v = e.target.value
        setDraft(v)
        dirty.current = true
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          dirty.current = false
          timer.current = null
          onCommit(v)
        }, 600)
      }}
      onKeyDown={onKeyDown}
      onBlur={() => { flush(); onBlur?.() }}
      className={className}
    />
  )
}

interface Props {
  task: Task
  onToggle: () => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onUpdate: (patch: Partial<Task>) => void
  onAddNote: (text: string) => void
  onUpdateNote: (noteId: string, text: string) => void
  onRemoveNote: (noteId: string) => void
}

export default function TaskItem({
  task, onToggle, onRemove, onMove, onUpdate, onAddNote, onUpdateNote, onRemoveNote,
}: Props) {
  const [noteDraft, setNoteDraft] = useState("")
  const [showNoteInput, setShowNoteInput] = useState(false)

  const cyclePriority = () => {
    const order: Priority[] = ["low", "med", "high"]
    onUpdate({ priority: order[(order.indexOf(task.priority) + 1) % 3] })
  }

  const submitNote = () => {
    if (!noteDraft.trim()) return setShowNoteInput(false)
    onAddNote(noteDraft)
    setNoteDraft("")
  }

  return (
    <li className="group rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-muted-foreground/25">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={task.done}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 accent-primary"
          aria-label={`Toggle ${task.title}`}
        />
        <button onClick={cyclePriority} className={pColor[task.priority]} title={`Priority: ${task.priority}`}>
          <Flag className="h-3.5 w-3.5" />
        </button>
        <DebouncedInput
          value={task.title}
          onCommit={(v) => onUpdate({ title: v })}
          className={`flex-1 bg-transparent text-sm outline-none ${
            task.done ? "text-muted-foreground line-through" : "text-foreground"
          }`}
        />
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            onClick={() => onUpdate({ pinned: !task.pinned })}
            title={task.pinned ? "Unpin routine" : "Mark as routine"}
            className={`rounded p-1 hover:bg-accent ${task.pinned ? "text-primary opacity-100" : "text-muted-foreground"}`}
          >
            <Pin className="h-3 w-3" />
          </button>
          <button onClick={() => setShowNoteInput(true)} title="Add note" className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <Plus className="h-3 w-3" />
          </button>
          <button onClick={() => onMove(-1)} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowUp className="h-3 w-3" />
          </button>
          <button onClick={() => onMove(1)} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowDown className="h-3 w-3" />
          </button>
          <button onClick={onRemove} className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {(task.notes.length > 0 || showNoteInput) && (
        <ul className="mt-1.5 space-y-1 pl-7">
          {task.notes.map((n) => (
            <li key={n.id} className="group/note flex items-center gap-2">
              <span className="text-muted-foreground">•</span>
              <input
                value={n.text}
                onChange={(e) => onUpdateNote(n.id, e.target.value)}
                className="flex-1 bg-transparent text-xs text-muted-foreground outline-none focus:text-foreground"
              />
              <button
                onClick={() => onRemoveNote(n.id)}
                className="opacity-0 transition-opacity group-hover/note:opacity-100 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
          {showNoteInput && (
            <li className="flex items-center gap-2">
              <CornerDownRight className="h-3 w-3 text-muted-foreground" />
              <input
                autoFocus
                value={noteDraft}
                placeholder="Note…"
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitNote()
                  if (e.key === "Escape") { setNoteDraft(""); setShowNoteInput(false) }
                }}
                onBlur={submitNote}
                className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
            </li>
          )}
        </ul>
      )}
    </li>
  )
}
