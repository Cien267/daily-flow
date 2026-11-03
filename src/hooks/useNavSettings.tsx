import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

export type NavTabKey = "schedule" | "pomodoro" | "eye-care" | "tasks" | "notes"

export interface NavTab {
  key: NavTabKey
  label: string
  description: string
}

export const NAV_TABS: NavTab[] = [
  { key: "schedule", label: "Schedule", description: "Daily timeline planner" },
  { key: "pomodoro", label: "Pomodoro", description: "Focus timer" },
  { key: "eye-care", label: "Eye Care", description: "20-20-20 reminders" },
  { key: "tasks", label: "Tasks", description: "Daily task planner" },
  { key: "notes", label: "Notes", description: "Quick notes" },
]

const STORAGE_KEY = "settings.nav.v1"
const ALL_KEYS = NAV_TABS.map((t) => t.key)

function readStored(): Record<NavTabKey, boolean> {
  const fallback = Object.fromEntries(ALL_KEYS.map((k) => [k, true])) as Record<
    NavTabKey,
    boolean
  >
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Record<NavTabKey, boolean>>
    const merged = { ...fallback, ...parsed }
    // Never allow hiding every tab — the app would become unreachable.
    if (!ALL_KEYS.some((k) => merged[k])) return fallback
    return merged
  } catch {
    return fallback
  }
}

interface NavSettingsState {
  visible: Record<NavTabKey, boolean>
  setVisibleTab: (key: NavTabKey, visible: boolean) => void
}

const NavSettingsContext = createContext<NavSettingsState>({
  visible: Object.fromEntries(ALL_KEYS.map((k) => [k, true])) as Record<
    NavTabKey,
    boolean
  >,
  setVisibleTab: () => {},
})

export function NavSettingsProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState<Record<NavTabKey, boolean>>(readStored)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visible))
  }, [visible])

  const setVisibleTab = (key: NavTabKey, v: boolean) => {
    setVisible((prev) => {
      // Keep at least one tab visible.
      const next = { ...prev, [key]: v }
      if (!ALL_KEYS.some((k) => next[k])) return prev
      return next
    })
  }

  return (
    <NavSettingsContext.Provider value={{ visible, setVisibleTab }}>
      {children}
    </NavSettingsContext.Provider>
  )
}

export function useNavSettings() {
  return useContext(NavSettingsContext)
}
