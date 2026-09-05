import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import {
  ScheduleBlock,
  defaultSchedule,
  type Category,
  type EnergyLevel,
  type FocusType,
} from "@/data/schedule"

interface BlockRow {
  id: string
  title: string
  start_time: string
  end_time: string | null
  category: string
  description: string | null
  energy_level: string
  focus_type: string
  task_style: string | null
  position: number
}

const rowToBlock = (r: BlockRow): ScheduleBlock => ({
  id: r.id,
  start: r.start_time,
  end: r.end_time,
  title: r.title,
  category: r.category as Category,
  description: r.description ?? "",
  energy_level: r.energy_level as EnergyLevel,
  focus_type: r.focus_type as FocusType,
  task_style: r.task_style ?? undefined,
})

const blockToRow = (b: ScheduleBlock, userId: string, position: number) => ({
  ...(b.id ? { id: b.id } : {}),
  user_id: userId,
  title: b.title,
  start_time: b.start,
  end_time: b.end,
  category: b.category,
  description: b.description,
  energy_level: b.energy_level,
  focus_type: b.focus_type,
  task_style: b.task_style ?? null,
  position,
})

const sortBlocks = (list: ScheduleBlock[]) =>
  [...list].sort((a, b) => a.start.localeCompare(b.start))

export function useSchedule() {
  const { user } = useAuth()
  const [blocks, setBlocksState] = useState<ScheduleBlock[]>([])
  const seeded = useRef(false)

  useEffect(() => {
    if (!user) {
      setBlocksState([])
      seeded.current = false
      return
    }
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from("schedule_blocks")
        .select("*")
        .order("position", { ascending: true })
      if (!alive) return
      if (error) {
        console.warn("[schedule] load", error)
        return
      }
      if (!data.length && !seeded.current) {
        seeded.current = true
        const rows = defaultSchedule.map((b, i) => blockToRow(b, user.id, i))
        const { data: inserted, error: insErr } = await supabase
          .from("schedule_blocks")
          .insert(rows)
          .select("*")
        if (!alive) return
        if (insErr) {
          console.warn("[schedule] seed", insErr)
          return
        }
        setBlocksState((inserted as BlockRow[]).map(rowToBlock))
        return
      }
      setBlocksState((data as BlockRow[]).map(rowToBlock))
    })()
    return () => {
      alive = false
    }
  }, [user])

  const add = (block: ScheduleBlock) => {
    if (!user) return
    const created = { ...block, id: block.id ?? crypto.randomUUID() }
    setBlocksState((prev) => sortBlocks([...prev, created]))
    supabase
      .from("schedule_blocks")
      .insert(blockToRow(created, user.id, blocks.length))
      .then(({ error }) => error && console.warn("[schedule] add", error))
  }

  const update = (index: number, block: ScheduleBlock) => {
    const current = blocks[index]
    const merged = { ...block, id: block.id ?? current?.id }
    setBlocksState((prev) => prev.map((b, i) => (i === index ? merged : b)))
    if (merged.id) {
      supabase
        .from("schedule_blocks")
        .update({
          title: merged.title,
          start_time: merged.start,
          end_time: merged.end,
          category: merged.category,
          description: merged.description,
          energy_level: merged.energy_level,
          focus_type: merged.focus_type,
          task_style: merged.task_style ?? null,
        })
        .eq("id", merged.id)
        .then(({ error }) => error && console.warn("[schedule] update", error))
    }
  }

  const remove = (index: number) => {
    const target = blocks[index]
    setBlocksState((prev) => prev.filter((_, i) => i !== index))
    if (target?.id) {
      supabase
        .from("schedule_blocks")
        .delete()
        .eq("id", target.id)
        .then(({ error }) => error && console.warn("[schedule] remove", error))
    }
  }

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[index], next[j]] = [next[j], next[index]]
    setBlocksState(next)
    const a = next[index]
    const b = next[j]
    if (a.id)
      supabase
        .from("schedule_blocks")
        .update({ position: index })
        .eq("id", a.id)
        .then(({ error }) => error && console.warn("[schedule] move", error))
    if (b.id)
      supabase
        .from("schedule_blocks")
        .update({ position: j })
        .eq("id", b.id)
        .then(({ error }) => error && console.warn("[schedule] move", error))
  }

  const reset = useCallback(() => {
    if (!user) return
    ;(async () => {
      const { error: delErr } = await supabase
        .from("schedule_blocks")
        .delete()
        .eq("user_id", user.id)
      if (delErr) {
        console.warn("[schedule] reset", delErr)
        return
      }
      const rows = defaultSchedule.map((b, i) => blockToRow(b, user.id, i))
      const { data, error } = await supabase
        .from("schedule_blocks")
        .insert(rows)
        .select("*")
      if (error) {
        console.warn("[schedule] reset seed", error)
        return
      }
      setBlocksState((data as BlockRow[]).map(rowToBlock))
    })()
  }, [user])

  const setBlocks = (next: ScheduleBlock[]) => {
    setBlocksState(next)
    return next
  }

  return { blocks, add, update, remove, move, reset, setBlocks }
}
