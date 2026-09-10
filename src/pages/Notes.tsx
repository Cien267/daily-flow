import { useState, useEffect, useRef } from "react"
import { Plus, Trash2, Search } from "lucide-react"
import { useNotes, Note } from "@/hooks/useNotes"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function Notes() {
  const { notes, loading, create: createNote, update, remove: removeNote } = useNotes()
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null)
  const [query, setQuery] = useState("")

  useEffect(() => { if (!activeId && notes[0]) setActiveId(notes[0].id) }, [notes, activeId])

  const active = notes.find((n) => n.id === activeId) ?? null

  // Local draft so typing (including Vietnamese IME) is never interrupted by refetch/re-render
  const [draft, setDraft] = useState<{ title: string; body: string }>({ title: "", body: "" })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef(false)

  useEffect(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    pending.current = false
    setDraft({ title: active?.title ?? "", body: active?.body ?? "" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useEffect(() => {
    if (!active || pending.current) return
    setDraft((d) =>
      d.title === active.title && d.body === active.body ? d : { title: active.title, body: active.body },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.title, active?.body])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const create = () => {
    const n = createNote()
    setActiveId(n.id)
  }
  const remove = (id: string) => {
    const next = notes.filter((n) => n.id !== id)
    removeNote(id)
    if (activeId === id) setActiveId(next[0]?.id ?? null)
  }
  const updateActive = (patch: Partial<Note>) => {
    if (!active) return
    const id = active.id
    const next = { ...draft, ...patch } as { title: string; body: string }
    setDraft(next)
    pending.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      pending.current = false
      timer.current = null
      update(id, next)
    }, 600)
  }

  const filtered = notes.filter((n) =>
    !query || n.title.toLowerCase().includes(query.toLowerCase()) || n.body.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] h-[calc(100dvh-3rem)]">
      <aside
        className={`border-r border-border flex-col min-h-0 ${mobileView === "list" ? "flex" : "hidden"} md:flex`}
      >
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Notes</h2>
            <Button size="sm" variant="ghost" onClick={create}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-7 h-8 text-xs" />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="px-3 py-2.5 border-b border-border space-y-2">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </li>
            ))}
          {!loading && filtered.length === 0 && <li className="p-4 text-xs text-muted-foreground text-center">No notes</li>}
          {filtered.map((n) => (
            <li key={n.id}>
              <button onClick={() => setActiveId(n.id)}
                className={`group w-full text-left px-3 py-2.5 border-b border-border hover:bg-accent/50 ${activeId === n.id ? "bg-accent" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{n.title || "Untitled"}</span>
                  <Trash2 onClick={(e) => { e.stopPropagation(); remove(n.id) }}
                    className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0" />
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{n.body.slice(0, 60) || "Empty"}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex flex-col min-h-0">
        {loading ? (
          <div className="px-6 pt-6 space-y-3">
            <div className="h-7 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ) : active ? (
          <>
            <input key={active.id + ":title"} value={draft.title} onChange={(e) => updateActive({ title: e.target.value })}
              placeholder="Title" className="px-6 pt-6 pb-3 bg-transparent text-2xl font-bold text-foreground outline-none" />
            <textarea key={active.id + ":body"} value={draft.body} onChange={(e) => updateActive({ body: e.target.value })}
              placeholder="Start writing..."
              className="flex-1 px-6 pb-6 bg-transparent text-sm text-foreground outline-none resize-none leading-relaxed" />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <p className="text-sm">No note selected</p>
            <Button onClick={create} size="sm"><Plus className="h-4 w-4" /> New note</Button>
          </div>
        )}
      </section>
    </div>
  )
}
