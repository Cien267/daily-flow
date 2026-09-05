import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"

export interface Note {
  id: string
  title: string
  body: string
  updatedAt: number
}

export function useNotes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    if (!user) {
      setNotes([])
      return
    }
    let alive = true
    supabase
      .from("notes")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return
        if (error) {
          console.warn("[notes] load", error)
          return
        }
        setNotes(
          (data ?? []).map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            updatedAt: Number(n.updated_at) || 0,
          })),
        )
      })
    return () => {
      alive = false
    }
  }, [user])

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
    supabase
      .from("notes")
      .update({ ...patch, updated_at: updatedAt })
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

  return { notes, create, update, remove }
}
