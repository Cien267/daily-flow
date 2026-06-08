import { useEffect, useState } from "react"
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil, RotateCcw, Check, X } from "lucide-react"
import { getCurrentBlockIndex, Category, FocusType, EnergyLevel, categoryConfig, ScheduleBlock } from "@/data/schedule"
import { useSchedule } from "@/hooks/useSchedule"
import TimelineBlock from "@/components/TimelineBlock"
import Legend from "@/components/Legend"
import ScheduleHeader from "@/components/ScheduleHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const energyOptions: EnergyLevel[] = ["peak","high","active","medium_high","medium","warm_up","cooldown","low","recovery","sleep_prep","restore"]
const focusOptions: FocusType[] = ["none","deep","focused","creative","body","learning","reactive","light"]

const empty: ScheduleBlock = {
  start: "08:00", end: "09:00", title: "", category: "work",
  description: "", energy_level: "medium", focus_type: "focused",
}

export default function Schedule() {
  const { blocks, add, update, remove, move, reset } = useSchedule()
  const [currentIdx, setCurrentIdx] = useState(getCurrentBlockIndex(blocks))
  const [editing, setEditing] = useState<{ index: number | null; block: ScheduleBlock } | null>(null)

  useEffect(() => {
    const iv = setInterval(() => setCurrentIdx(getCurrentBlockIndex(blocks)), 30000)
    return () => clearInterval(iv)
  }, [blocks])

  useEffect(() => { setCurrentIdx(getCurrentBlockIndex(blocks)) }, [blocks])

  const openAdd = () => setEditing({ index: null, block: { ...empty } })
  const openEdit = (i: number) => setEditing({ index: i, block: { ...blocks[i] } })

  const save = () => {
    if (!editing) return
    if (editing.index === null) add(editing.block)
    else update(editing.index, editing.block)
    setEditing(null)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <ScheduleHeader />
      <Legend />

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Timeline</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={reset} title="Reset to defaults">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" /> Add block
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-1">
        {blocks.map((block, i) => (
          <div key={`${block.start}-${i}`} className="group/row relative">
            <TimelineBlock block={block} index={i} isCurrent={i === currentIdx} total={blocks.length} />
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
              <button onClick={() => move(i, -1)} disabled={i === 0}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30">
                <ArrowUp className="h-3 w-3" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30">
                <ArrowDown className="h-3 w-3" />
              </button>
              <button onClick={() => openEdit(i)}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                <Pencil className="h-3 w-3" />
              </button>
              <button onClick={() => remove(i)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
        {blocks.length} blocks · Hover a block to edit
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.index === null ? "Add block" : "Edit block"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <Input placeholder="Title" value={editing.block.title}
                onChange={(e) => setEditing({ ...editing, block: { ...editing.block, title: e.target.value } })} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={editing.block.start}
                  onChange={(e) => setEditing({ ...editing, block: { ...editing.block, start: e.target.value } })} />
                <Input type="time" value={editing.block.end ?? ""}
                  onChange={(e) => setEditing({ ...editing, block: { ...editing.block, end: e.target.value || null } })} />
              </div>
              <Input placeholder="Description" value={editing.block.description}
                onChange={(e) => setEditing({ ...editing, block: { ...editing.block, description: e.target.value } })} />
              <div className="grid grid-cols-3 gap-2">
                <Select value={editing.block.category}
                  onValueChange={(v: Category) => setEditing({ ...editing, block: { ...editing.block, category: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(categoryConfig) as Category[]).map((k) => (
                      <SelectItem key={k} value={k}>{categoryConfig[k].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={editing.block.energy_level}
                  onValueChange={(v: EnergyLevel) => setEditing({ ...editing, block: { ...editing.block, energy_level: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{energyOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editing.block.focus_type}
                  onValueChange={(v: FocusType) => setEditing({ ...editing, block: { ...editing.block, focus_type: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{focusOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /> Cancel</Button>
            <Button onClick={save} disabled={!editing?.block.title}><Check className="h-4 w-4" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
