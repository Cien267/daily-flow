import { useEffect, useRef, useState, useCallback } from "react"
import { Eye, Play, Pause, RotateCcw, MonitorPlay, X } from "lucide-react"
import { useLocalStorage } from "@/lib/useLocalStorage"

type Phase = "focus" | "rest"

interface EyeCareRuntime {
  phase: Phase
  timeLeft: number
  isRunning: boolean
  endAt: number | null
  cycles: number
}

const readRuntime = (focusMin: number, restSec: number): EyeCareRuntime => {
  const fallback: EyeCareRuntime = {
    phase: "focus",
    timeLeft: focusMin * 60,
    isRunning: false,
    endAt: null,
    cycles: Number(localStorage.getItem("eye.cycles") ?? 0),
  }
  try {
    const saved = JSON.parse(
      localStorage.getItem("eye.runtime.v1") ?? "null",
    ) as EyeCareRuntime | null
    if (!saved || !saved.phase) return fallback

    let next = saved
    const now = Date.now()
    while (next.isRunning && next.endAt !== null && next.endAt <= now) {
      const phase: Phase = next.phase === "focus" ? "rest" : "focus"
      const duration = phase === "focus" ? focusMin * 60 : restSec
      next = {
        phase,
        timeLeft: duration,
        isRunning: true,
        endAt: next.endAt + duration * 1000,
        cycles: next.cycles + (phase === "focus" ? 1 : 0),
      }
    }
    return next.isRunning && next.endAt !== null
      ? {
          ...next,
          timeLeft: Math.max(0, Math.ceil((next.endAt - now) / 1000)),
        }
      : next
  } catch {
    return fallback
  }
}

export default function EyeCare() {
  const [focusMin, setFocusMin] = useLocalStorage("eye.focusMin", 20)
  const [restSec, setRestSec] = useLocalStorage("eye.restSec", 20)
  const [runtime, setRuntime] = useState<EyeCareRuntime>(() =>
    readRuntime(focusMin, restSec),
  )
  const { phase, timeLeft, isRunning, cycles } = runtime
  const [pipOpen, setPipOpen] = useState(false)
  const pipRef = useRef<Window | null>(null)
  const pipIv = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = phase === "focus" ? focusMin * 60 : restSec
  const progress = ((total - timeLeft) / total) * 100

  useEffect(() => {
    localStorage.setItem("eye.runtime.v1", JSON.stringify(runtime))
    localStorage.setItem("eye.cycles", String(cycles))
  }, [runtime, cycles])

  useEffect(() => {
    if (!isRunning) {
      setRuntime((current) => ({
        ...current,
        timeLeft: current.phase === "focus" ? focusMin * 60 : restSec,
        endAt: null,
      }))
    }
  }, [focusMin, restSec, isRunning])

  useEffect(() => {
    if (!isRunning) return
    const iv = setInterval(() => {
      setRuntime((current) => {
        if (!current.isRunning || current.endAt === null) return current
        const remaining = Math.max(
          0,
          Math.ceil((current.endAt - Date.now()) / 1000),
        )
        if (remaining <= 0) {
          if (current.phase === "focus") {
            beep(880)
            return {
              ...current,
              phase: "rest",
              timeLeft: restSec,
              endAt: Date.now() + restSec * 1000,
            }
          } else {
            beep(520)
            return {
              ...current,
              phase: "focus",
              timeLeft: focusMin * 60,
              endAt: Date.now() + focusMin * 60 * 1000,
              cycles: current.cycles + 1,
            }
          }
        }
        return remaining === current.timeLeft
          ? current
          : { ...current, timeLeft: remaining }
      })
    }, 250)
    return () => clearInterval(iv)
  }, [isRunning, focusMin, restSec])

  const beep = (freq: number) => {
    try {
      const ctx = new AudioContext()
      const now = ctx.currentTime

      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = "triangle"
        osc.frequency.value = freq * (1 + i * 0.15)

        osc.connect(gain)
        gain.connect(ctx.destination)

        const start = now + i * 0.2

        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.15, start + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4)

        osc.start(start)
        osc.stop(start + 0.4)
      }
    } catch (e) {
      console.error("Error occurred while playing sound:", e)
    }
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60),
      sec = s % 60
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  }

  const reset = () => {
    setRuntime((current) => ({
      ...current,
      isRunning: false,
      phase: "focus",
      timeLeft: focusMin * 60,
      endAt: null,
    }))
  }

  const color = phase === "focus" ? "#3b82f6" : "#22c55e"
  const label = phase === "focus" ? "Look at screen" : "Look 20ft away"

  const updatePip = useCallback(() => {
    const doc = pipRef.current?.document
    if (!doc) return
    doc.body.innerHTML = `
      <div style="font-family:Inter,system-ui;background:#0a0a0f;color:#e4e4e7;height:100%;padding:16px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
        <span style="font-size:11px;color:${color};text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">${label}</span>
        <span style="font-size:36px;font-weight:700;font-family:'JetBrains Mono',monospace;">${fmt(timeLeft)}</span>
        <div style="width:80%;height:4px;background:#27272a;border-radius:2px;overflow:hidden;">
          <div style="width:${progress}%;height:100%;background:${color};transition:width 1s linear;"></div>
        </div>
        <span style="font-size:10px;color:#52525b;">${cycles} cycles · ${isRunning ? "running" : "paused"}</span>
      </div>`
  }, [timeLeft, progress, color, label, cycles, isRunning])

  useEffect(() => {
    if (pipOpen) updatePip()
  }, [pipOpen, updatePip])

  const openPip = async () => {
    if (!("documentPictureInPicture" in window)) {
      alert("PiP not supported. Try Chrome 116+.")
      return
    }
    // @ts-ignore
    const w = await window.documentPictureInPicture.requestWindow({
      width: 240,
      height: 200,
    })
    pipRef.current = w
    setPipOpen(true)
    const s = w.document.createElement("style")
    s.textContent = "body{margin:0;background:#0a0a0f;overflow:hidden;}"
    w.document.head.appendChild(s)
    updatePip()
    pipIv.current = setInterval(updatePip, 1000)
    w.addEventListener("pagehide", () => {
      setPipOpen(false)
      pipRef.current = null
      if (pipIv.current) clearInterval(pipIv.current)
    })
  }
  const closePip = () => {
    pipRef.current?.close()
    setPipOpen(false)
    if (pipIv.current) clearInterval(pipIv.current)
  }

  useEffect(
    () => () => {
      pipRef.current?.close()
      if (pipIv.current) clearInterval(pipIv.current)
    },
    [],
  )

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-14">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Eye size={12} />
          <span>20-20-20 rule</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Eye Care
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every {focusMin} minutes, look at something{" "}
          {restSec === 20 ? "20 feet" : `for ${restSec}s`} away to relax your
          eyes.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-8">
        <div className="flex flex-col items-center gap-6">
          <span
            className="text-[11px] uppercase tracking-wider font-semibold"
            style={{ color }}
          >
            {label}
          </span>
          <div className="relative">
            <svg
              width="180"
              height="180"
              viewBox="0 0 180 180"
              className="-rotate-90"
            >
              <circle
                cx="90"
                cy="90"
                r="78"
                fill="none"
                className="stroke-muted/30"
                strokeWidth="6"
              />
              <circle
                cx="90"
                cy="90"
                r="78"
                fill="none"
                stroke={color}
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 78}
                strokeDashoffset={2 * Math.PI * 78 * (1 - progress / 100)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-4xl font-bold text-foreground">
                {fmt(timeLeft)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={reset}
              className="rounded-full p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
              className="rounded-full p-3 hover:opacity-80"
              style={{ background: `${color}22`, color }}
            >
              {isRunning ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>
            <button
              onClick={pipOpen ? closePip : openPip}
              className="rounded-full p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              title="PiP"
            >
              {pipOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <MonitorPlay className="h-4 w-4" />
              )}
            </button>
          </div>

          <span className="text-xs text-muted-foreground">
            {cycles} completed cycles today-ish
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">
              Focus (minutes)
            </span>
            <input
              type="number"
              min={1}
              max={120}
              value={focusMin}
              onChange={(e) => setFocusMin(Math.max(1, Number(e.target.value)))}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">
              Rest (seconds)
            </span>
            <input
              type="number"
              min={5}
              max={300}
              value={restSec}
              onChange={(e) => setRestSec(Math.max(5, Number(e.target.value)))}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>
    </div>
  )
}
