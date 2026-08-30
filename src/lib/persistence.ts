import { useEffect, useRef, useState } from "react"
import { API_ENABLED, api, silent } from "@/lib/api"

/**
 * Generic key/value app state (settings + timer runtime).
 * Local mode  -> localStorage
 * API mode    -> GET/PUT  /api/state/:key
 */

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function saveState<T>(key: string, value: T): void {
  if (API_ENABLED) {
    silent(api.put(`/api/state/${encodeURIComponent(key)}`, { value }))
    return
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export async function loadState<T>(key: string, fallback: T): Promise<T> {
  if (!API_ENABLED) return readLocal(key, fallback)
  try {
    const res = await api.get<{ value: T } | null>(`/api/state/${encodeURIComponent(key)}`)
    return res && res.value !== undefined && res.value !== null ? res.value : fallback
  } catch {
    return fallback
  }
}

/** Drop-in replacement for useLocalStorage that follows the API flag. */
export function usePersistedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => (API_ENABLED ? initial : readLocal(key, initial)))
  const hydrated = useRef(!API_ENABLED)

  useEffect(() => {
    if (!API_ENABLED) return
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
