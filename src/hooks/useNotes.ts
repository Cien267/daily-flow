import { useEffect, useRef, useState } from "react"
import { API_ENABLED, api, silent, uid } from "@/lib/api"
import { readLocal, saveState } from "@/lib/persistence"

export interface Note {
  id: string
  title: string
  body: string
  updatedAt: number
}

const KEY = "notes.v1"

export function useNotes() {
  const [notes, setNotesState] = useState<Note[]>(() =>
    API_ENABLED ? [] : readLocal<Note[]>(KEY, []),
  )
  const hydrated = useRef(!API_ENABLED)

  useEffect(() => {
    if (!API_ENABLED) return
    let alive = true
    api
      .get<Note[]>("/api/notes")
      .then((list) => {
        if (!alive) return
        hydrated.current = true
        setNotesState(list ?? [])
      })
      .catch((e) => console.warn("[api] notes", e))
    return () => {
      alive = false
    }
  }, [])

  const commit = (next: Note[]) => {
    setNotesState(next)
    if (!API_ENABLED) saveState(KEY, next)
  }

  const create = (): Note => {
    const n: Note = { id: uid(), title: "Untitled", body: "", updatedAt: Date.now() }
    commit([n, ...notes])
    if (API_ENABLED) silent(api.post("/api/notes", n))
    return n
  }

  const update = (id: string, patch: Partial<Omit<Note, "id">>) => {
    const updatedAt = Date.now()
    commit(notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt } : n)))
    if (API_ENABLED) silent(api.patch(`/api/notes/${id}`, { ...patch, updatedAt }))
  }

  const remove = (id: string) => {
    commit(notes.filter((n) => n.id !== id))
    if (API_ENABLED) silent(api.del(`/api/notes/${id}`))
  }

  return { notes, create, update, remove }
}
