/**
 * Personal accent color. Applied as `data-accent` on <html>, which overrides
 * --primary / --ring / --sidebar-primary in src/index.css. Persisted in
 * localStorage so the choice survives reloads (cloud sync can come later).
 */
import { useEffect, useState } from "react"

export type AccentKey = "blue" | "violet" | "emerald" | "rose" | "amber"

export const ACCENTS: { key: AccentKey; label: string; swatch: string }[] = [
  { key: "blue", label: "Blue", swatch: "hsl(225 73% 55%)" },
  { key: "violet", label: "Violet", swatch: "hsl(262 70% 60%)" },
  { key: "emerald", label: "Emerald", swatch: "hsl(158 65% 45%)" },
  { key: "rose", label: "Rose", swatch: "hsl(350 75% 55%)" },
  { key: "amber", label: "Amber", swatch: "hsl(38 90% 50%)" },
]

export const DEFAULT_ACCENT: AccentKey = "blue"
const STORAGE_KEY = "settings.accent.v1"

export function applyAccent(key: AccentKey): void {
  document.documentElement.dataset.accent = key
}

export function readStoredAccent(): AccentKey {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && ACCENTS.some((a) => a.key === raw)) return raw as AccentKey
  } catch {
    /* ignore */
  }
  return DEFAULT_ACCENT
}

interface AccentState {
  accent: AccentKey
  setAccent: (key: AccentKey) => void
}

export function useAccentColor(): AccentState {
  const [accent, setAccentState] = useState<AccentKey>(readStoredAccent)

  // Apply the stored choice on mount (AppSidebar is always mounted).
  useEffect(() => {
    applyAccent(readStoredAccent())
  }, [])

  const setAccent = (key: AccentKey) => {
    setAccentState(key)
    applyAccent(key)
    try {
      localStorage.setItem(STORAGE_KEY, key)
    } catch {
      /* ignore */
    }
  }

  return { accent, setAccent }
}
