import { useState, useEffect, useCallback, useRef } from "react"
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  MonitorPlay,
  X,
  Timer,
  Settings,
} from "lucide-react"
import { API_ENABLED } from "@/lib/api"
import {
  loadState,
  readLocal,
  saveState,
  usePersistedState,
} from "@/lib/persistence"

type PomodoroMode = "work" | "short_break" | "long_break"

interface PomodoroConfig {
  work: number
  short_break: number
  long_break: number
  sessions_before_long: number
  autoStart: boolean
}

const DEFAULT_CONFIG: PomodoroConfig = {
  work: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
  sessions_before_long: 4,
  autoStart: false,
}

const MODE_LABELS: Record<PomodoroMode, string> = {
  work: "Focus",
  short_break: "Short Break",
  long_break: "Long Break",
}

const MODE_COLORS: Record<PomodoroMode, string> = {
  work: "#e84393",
  short_break: "#22c55e",
  long_break: "#3b82f6",
}

interface PomodoroRuntime {
  mode: PomodoroMode
  timeLeft: number
  isRunning: boolean
  endAt: number | null
  completedSessions: number
}

const RUNTIME_KEY = "pomodoro.runtime.v1"

const resolveRuntime = (
  config: PomodoroConfig,
  saved: PomodoroRuntime | null,
): PomodoroRuntime => {
  const fallback: PomodoroRuntime = {
    mode: "work",
    timeLeft: config.work,
    isRunning: false,
    endAt: null,
    completedSessions: 0,
  }

  try {
    if (!saved || !saved.mode) return fallback

    let next = saved
    const now = Date.now()
    while (next.isRunning && next.endAt !== null && next.endAt <= now) {
      const completedAt = next.endAt
      const completedSessions =
        next.mode === "work"
          ? next.completedSessions + 1
          : next.completedSessions
      const mode: PomodoroMode =
        next.mode === "work"
          ? completedSessions % config.sessions_before_long === 0
            ? "long_break"
            : "short_break"
          : "work"

      next = {
        mode,
        completedSessions,
        timeLeft: config[mode],
        isRunning: config.autoStart,
        endAt: config.autoStart ? completedAt + config[mode] * 1000 : null,
      }
    }

    if (next.isRunning && next.endAt !== null) {
      next = {
        ...next,
        timeLeft: Math.max(0, Math.ceil((next.endAt - now) / 1000)),
      }
    }
    return next
  } catch {
    return fallback
  }
}

export default function PomodoroTimer() {
  const [config, setConfig] = usePersistedState<PomodoroConfig>(
    "pomodoro.config.v1",
    DEFAULT_CONFIG,
  )
  const [runtime, setRuntime] = useState<PomodoroRuntime>(() =>
    resolveRuntime(
      config,
      API_ENABLED ? null : readLocal<PomodoroRuntime | null>(RUNTIME_KEY, null),
    ),
  )
  const runtimeHydrated = useRef(!API_ENABLED)
  const { mode, timeLeft, isRunning, completedSessions } = runtime
  const [showSettings, setShowSettings] = useState(false)
  const [pipOpen, setPipOpen] = useState(false)
  const pipWindowRef = useRef<Window | null>(null)
  const pipIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalTime = config[mode]
  const progress = ((totalTime - timeLeft) / totalTime) * 100

  useEffect(() => {
    if (!API_ENABLED) return
    let alive = true
    loadState<PomodoroRuntime | null>(RUNTIME_KEY, null).then((saved) => {
      if (!alive) return
      runtimeHydrated.current = true
      setRuntime(resolveRuntime(config, saved))
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!runtimeHydrated.current) return
    saveState(RUNTIME_KEY, runtime)
  }, [runtime])

  const advance = useCallback(
    (current: PomodoroRuntime, autoRun = config.autoStart) => {
      const completed =
        current.mode === "work"
          ? current.completedSessions + 1
          : current.completedSessions
      const nextMode: PomodoroMode =
        current.mode === "work"
          ? completed % config.sessions_before_long === 0
            ? "long_break"
            : "short_break"
          : "work"
      return {
        mode: nextMode,
        timeLeft: config[nextMode],
        isRunning: autoRun,
        endAt: autoRun ? Date.now() + config[nextMode] * 1000 : null,
        completedSessions: completed,
      }
    },
    [config],
  )

  // Derive remaining time from an absolute deadline so background tabs,
  // route changes and reloads cannot pause the timer.
  useEffect(() => {
    if (!isRunning) return
    const iv = setInterval(() => {
      setRuntime((current) => {
        if (!current.isRunning || current.endAt === null) return current
        const remaining = Math.max(
          0,
          Math.ceil((current.endAt - Date.now()) / 1000),
        )
        if (remaining <= 0) return advance(current)
        return remaining === current.timeLeft
          ? current
          : { ...current, timeLeft: remaining }
      })
    }, 250)
    return () => clearInterval(iv)
  }, [isRunning, advance])

  const switchMode = useCallback(
    (newMode: PomodoroMode, autoRun = false) => {
      setRuntime((current) => ({
        ...current,
        mode: newMode,
        timeLeft: config[newMode],
        isRunning: autoRun,
        endAt: autoRun ? Date.now() + config[newMode] * 1000 : null,
      }))
    },
    [config],
  )

  const handleComplete = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      gain.gain.value = 0.1
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } catch (e: any) {
      console.error("Error occurred while playing sound:", e)
    }

    setRuntime((current) => advance(current))
  }, [advance])

  const reset = () => {
    setRuntime((current) => ({
      ...current,
      timeLeft: config[current.mode],
      isRunning: false,
      endAt: null,
    }))
  }

  const skip = () => {
    setRuntime((current) => advance(current, false))
  }

  // Sync timeLeft when config changes for the current mode (if not running)
  useEffect(() => {
    if (!isRunning) {
      setRuntime((current) => ({
        ...current,
        timeLeft: config[current.mode],
        endAt: null,
      }))
    }
  }, [config, mode]) // eslint-disable-line

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  }

  // --- PiP ---
  const updatePipContent = useCallback(() => {
    const doc = pipWindowRef.current?.document
    if (!doc) return

    const color = MODE_COLORS[mode]
    const radius = 40
    const circumference = 2 * Math.PI * radius
    const dashOffset = circumference * (1 - progress / 100)

    doc.body.innerHTML = `
      <div style="
        font-family: Inter, system-ui, sans-serif;
        background: #0a0a0f;
        color: #e4e4e7;
        height: 100%;
        padding: 16px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
      ">
        <span style="font-size:11px;color:${color};text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">
          ${MODE_LABELS[mode]}
        </span>
        <svg width="100" height="100" viewBox="0 0 100 100" style="transform:rotate(-90deg);">
          <circle cx="50" cy="50" r="${radius}" fill="none" stroke="#27272a" stroke-width="6"/>
          <circle cx="50" cy="50" r="${radius}" fill="none" stroke="${color}" stroke-width="6"
            stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
            stroke-linecap="round" style="transition:stroke-dashoffset 1s linear;"/>
        </svg>
        <span style="font-size:32px;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:-0.02em;margin-top:-4px;">
          ${formatTime(timeLeft)}
        </span>
        <div style="display:flex;gap:4px;margin-top:2px;">
          ${Array.from(
            { length: config.sessions_before_long },
            (_, i) =>
              `<div style="width:8px;height:8px;border-radius:50%;background:${i < completedSessions % config.sessions_before_long || (completedSessions > 0 && completedSessions % config.sessions_before_long === 0) ? color : "#27272a"};"></div>`,
          ).join("")}
        </div>
        <span style="font-size:10px;color:#52525b;">${isRunning ? "Running" : "Paused"} · ${completedSessions} sessions</span>
      </div>
    `
  }, [mode, timeLeft, progress, isRunning, completedSessions])

  useEffect(() => {
    if (pipOpen) updatePipContent()
  }, [pipOpen, updatePipContent])

  const openPip = useCallback(async () => {
    if (!("documentPictureInPicture" in window)) {
      alert(
        "Your browser doesn't support Document Picture-in-Picture. Try Chrome 116+.",
      )
      return
    }
    try {
      // @ts-ignore
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 280,
        height: 300,
      })
      pipWindowRef.current = pipWindow
      setPipOpen(true)

      const style = pipWindow.document.createElement("style")
      style.textContent = `body { margin: 0; overflow: hidden; background: #0a0a0f; }`
      pipWindow.document.head.appendChild(style)

      updatePipContent()
      pipIntervalRef.current = setInterval(updatePipContent, 1000)

      pipWindow.addEventListener("pagehide", () => {
        setPipOpen(false)
        pipWindowRef.current = null
        if (pipIntervalRef.current) clearInterval(pipIntervalRef.current)
      })
    } catch (e) {
      console.error("PiP failed:", e)
    }
  }, [updatePipContent])

  const closePip = useCallback(() => {
    pipWindowRef.current?.close()
    setPipOpen(false)
    pipWindowRef.current = null
    if (pipIntervalRef.current) clearInterval(pipIntervalRef.current)
  }, [])

  useEffect(() => {
    return () => {
      if (pipIntervalRef.current) clearInterval(pipIntervalRef.current)
      pipWindowRef.current?.close()
    }
  }, [])

  // --- UI colors by mode ---
  const modeStyles: Record<
    PomodoroMode,
    { ring: string; bg: string; text: string; badge: string }
  > = {
    work: {
      ring: "stroke-pink-500",
      bg: "bg-pink-500/10",
      text: "text-pink-400",
      badge: "border-pink-500/30 bg-pink-500/10 text-pink-400",
    },
    short_break: {
      ring: "stroke-green-500",
      bg: "bg-green-500/10",
      text: "text-green-400",
      badge: "border-green-500/30 bg-green-500/10 text-green-400",
    },
    long_break: {
      ring: "stroke-blue-500",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      badge: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    },
  }

  const styles = modeStyles[mode]
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress / 100)

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Pomodoro
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-medium transition-colors ${
              showSettings
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
            title="Settings"
          >
            <Settings className="h-3 w-3" />
          </button>
          <button
            onClick={pipOpen ? closePip : openPip}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-medium transition-colors ${
              pipOpen
                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
            title={pipOpen ? "Close PiP" : "Open PiP"}
          >
            {pipOpen ? (
              <X className="h-3 w-3" />
            ) : (
              <MonitorPlay className="h-3 w-3" />
            )}
            {pipOpen ? "Close" : "PiP"}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-6 rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["work", "Focus (min)"],
                ["short_break", "Short (min)"],
                ["long_break", "Long (min)"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {label}
                </span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={Math.round(config[k] / 60)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      [k]: Math.max(1, Number(e.target.value)) * 60,
                    })
                  }
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 items-center">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Sessions/long break
              </span>
              <input
                type="number"
                min={2}
                max={10}
                value={config.sessions_before_long}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    sessions_before_long: Math.max(2, Number(e.target.value)),
                  })
                }
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                checked={config.autoStart}
                onChange={(e) =>
                  setConfig({ ...config, autoStart: e.target.checked })
                }
                className="accent-primary"
              />
              <span className="text-xs text-foreground">
                Auto-start next session
              </span>
            </label>
          </div>
          <button
            onClick={() => {
              setConfig(DEFAULT_CONFIG)
              setRuntime({
                mode: "work",
                timeLeft: DEFAULT_CONFIG.work,
                isRunning: false,
                endAt: null,
                completedSessions: 0,
              })
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground underline"
          >
            Reset to defaults
          </button>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 mb-6 rounded-lg bg-muted/50 p-1">
        {(["work", "short_break", "long_break"] as PomodoroMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
              mode === m
                ? `${styles.bg} ${styles.text}`
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <svg
            width="140"
            height="140"
            viewBox="0 0 140 140"
            className="-rotate-90"
          >
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              className="stroke-muted/30"
              strokeWidth="6"
            />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              className={styles.ring}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
              {formatTime(timeLeft)}
            </span>
            <span className={`text-[10px] font-medium ${styles.text}`}>
              {MODE_LABELS[mode]}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              setRuntime((current) => ({
                ...current,
                isRunning: !current.isRunning,
                endAt: current.isRunning
                  ? null
                  : Date.now() + current.timeLeft * 1000,
              }))
            }
            className={`rounded-full p-3 transition-colors ${styles.bg} ${styles.text} hover:opacity-80`}
            title={isRunning ? "Pause" : "Start"}
          >
            {isRunning ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </button>
          <button
            onClick={skip}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            title="Skip"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Session dots */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {Array.from({ length: config.sessions_before_long }, (_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i < completedSessions % config.sessions_before_long ||
                  (completedSessions > 0 &&
                    completedSessions % config.sessions_before_long === 0)
                    ? styles.text.replace("text-", "bg-")
                    : "bg-muted/40"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {completedSessions} session{completedSessions !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  )
}
