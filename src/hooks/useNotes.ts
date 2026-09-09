import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"

export interface Note {
  id: string
  title: string
  body: string
  updatedAt: number
}

async function fetchNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("updated_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    updatedAt: Number(n.updated_at) || 0,
  }))
}

export function useNotes() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = ["notes", user?.id] as const

  const { data, isPending } = useQuery({
    queryKey,
    queryFn: fetchNotes,
    enabled: !!user,
  })

  const notes = data ?? []
  const loading = !!user && isPending

  const setNotes = (updater: (prev: Note[]) => Note[]) => {
    queryClient.setQueryData<Note[]>(queryKey, (prev) => updater(prev ?? []))
  }

  const create = (): Note => {
    const n: Note = {
      id: crypto.randomUUID(),
      title: "Untitled",
      body: "",
      updatedAt: Date.now(),
    }
    setNotes((prev) => [n, ...prev])
    if (user) {
      supabase
        .from("notes")
        .insert({
          id: n.id,
          user_id: user.id,
          title: n.title,
          body: n.body,
          updated_at: n.updatedAt,
        })
        .then(({ error }) => error && console.warn("[notes] create", error))
    }
    return n
  }

  const update = (id: string, patch: Partial<Omit<Note, "id">>) => {
    const updatedAt = Date.now()
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt } : n)),
    )
    const row: { title?: string; body?: string; updated_at: number } = {
      updated_at: updatedAt,
    }
    if (patch.title !== undefined) row.title = patch.title
    if (patch.body !== undefined) row.body = patch.body
    supabase
      .from("notes")
      .update(row)
      .eq("id", id)
      .then(({ error }) => error && console.warn("[notes] update", error))
  }

  const remove = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    supabase
      .from("notes")
      .delete()
      .eq("id", id)
      .then(({ error }) => error && console.warn("[notes] remove", error))
  }

  return { notes, loading, create, update, remove }
}
