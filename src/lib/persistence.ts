/**
 * Cloud-backed key/value persistence (per user) via the `app_state` table.
 * Used for Pomodoro / Eye Care config and runtime state.
 *
 * Writes are debounced per key so high-frequency timer updates don't
 * hammer the database.
 */
import { useEffect, useRef, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function loadState<T>(key: string, fallback: T): Promise<T> {
  try {
    const { data, error } = await supabase
      .from("app_state")
      .select("value")
      .eq("key", key)
      .maybeSingle()
    if (error) throw error
    return data && data.value !== null && data.value !== undefined
      ? (data.value as T)
      : fallback
  } catch (e) {
    console.warn("[state] load", key, e)
    return fallback
  }
}

const pending = new Map<string, ReturnType<typeof setTimeout>>()

export function saveState<T>(key: string, value: T): void {
  const existing = pending.get(key)
  if (existing) clearTimeout(existing)
  pending.set(
    key,
    setTimeout(async () => {
      pending.delete(key)
      try {
        const userId = await getUserId()
        if (!userId) return
        const { error } = await supabase.from("app_state").upsert(
          {
            user_id: userId,
            key,
            value: JSON.parse(JSON.stringify(value ?? null)),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,key" },
        )
        if (error) throw error
      } catch (e) {
        console.warn("[state] save", key, e)
      }
    }, 400),
  )
}

/** useState persisted to the cloud `app_state` table. */
export function usePersistedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const hydrated = useRef(false)

  useEffect(() => {
    let alive = true
    loadState<T>(key, initial).then((v) => {
      if (!alive) return
      hydrated.current = true
      setValue(v)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    if (!hydrated.current) return
    saveState(key, value)
  }, [key, value])

  return [value, setValue] as const
}
