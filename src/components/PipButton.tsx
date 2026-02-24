import { useState, useEffect, useCallback, useRef } from "react"
import { MonitorPlay, X } from "lucide-react"
import {
  schedule,
  categoryConfig,
  energyMap,
  getCurrentBlockIndex,
  getCurrentProgress,
  getCurrentTimeUTC7,
  getDurationMinutes,
  formatDuration,
} from "@/data/schedule"

export default function PipButton() {
  const [pipOpen, setPipOpen] = useState(false)
  const pipWindowRef = useRef<Window | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const updatePipContent = useCallback(() => {
    const doc = pipWindowRef.current?.document
    if (!doc) return

    const idx = getCurrentBlockIndex(schedule)
    const block = idx >= 0 ? schedule[idx] : null
    const nextBlock = idx >= 0 && idx < schedule.length - 1 ? schedule[idx + 1] : null
    const time = getCurrentTimeUTC7()

    if (!block) {
      doc.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-family:Inter,system-ui,sans-serif;">No active block</div>`
      return
    }

    const cat = categoryConfig[block.category]
    const energy = energyMap[block.energy_level]
    const progress = getCurrentProgress(block)
    const duration = getDurationMinutes(block.start, block.end)
    const remaining = Math.max(0, Math.round(duration * (1 - progress / 100)))

    // Category colors mapped to hex for PiP (no CSS vars available)
    const catColors: Record<string, string> = {
      personal: "#f59e0b",
      growth: "#a855f7",
      work: "#4169e1",
      recovery: "#22c55e",
      business: "#f97316",
      health: "#10b981",
      learning: "#06b6d4",
      "work-flex": "#64748b",
      reflection: "#ec4899",
    }

    const color = catColors[block.category] || "#888"

    doc.body.innerHTML = `
      <div style="
        font-family: Inter, system-ui, sans-serif;
        background: #0a0a0f;
        color: #e4e4e7;
        height: 100%;
        padding: 16px 20px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 10px;
      ">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:11px;color:#71717a;font-family:'JetBrains Mono',monospace;">${time}</span>
          <span style="
            font-size:10px;
            padding:2px 8px;
            border-radius:9999px;
            background:${color}22;
            color:${color};
            border:1px solid ${color}44;
          ">${cat.label}</span>
        </div>

        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color}88;flex-shrink:0;"></div>
          <span style="font-size:16px;font-weight:600;letter-spacing:-0.01em;">${block.title}</span>
        </div>

        <div style="font-size:11px;color:#a1a1aa;line-height:1.4;">${block.description}</div>

        <div style="margin-top:auto;display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#71717a;">
            <span>${block.start} – ${block.end || "∞"}</span>
            <span>${remaining}m left</span>
          </div>
          <div style="height:4px;background:#27272a;border-radius:2px;overflow:hidden;">
            <div style="height:100%;width:${progress}%;background:${color};border-radius:2px;transition:width 1s linear;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;color:#52525b;">Energy: ${energy.label}</span>
            <div style="display:flex;gap:2px;">
              ${Array.from({ length: 5 }, (_, i) =>
                `<div style="width:4px;height:10px;border-radius:1px;background:${i < Math.round(energy.percent / 20) ? color : "#27272a"};"></div>`
              ).join("")}
            </div>
          </div>
          ${nextBlock ? `<div style="font-size:10px;color:#52525b;border-top:1px solid #1e1e2a;padding-top:6px;margin-top:2px;">Next: ${nextBlock.title} at ${nextBlock.start}</div>` : ""}
        </div>
      </div>
    `
  }, [])

  const openPip = useCallback(async () => {
    if (!("documentPictureInPicture" in window)) {
      alert("Your browser doesn't support Document Picture-in-Picture. Try Chrome 116+.")
      return
    }

    try {
      // @ts-ignore - Document PiP API
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 240,
      })

      pipWindowRef.current = pipWindow
      setPipOpen(true)

      // Style the pip window
      const style = pipWindow.document.createElement("style")
      style.textContent = `
        body { margin: 0; overflow: hidden; background: #0a0a0f; }
        * { box-sizing: border-box; }
      `
      pipWindow.document.head.appendChild(style)

      updatePipContent()
      intervalRef.current = setInterval(updatePipContent, 5000)

      pipWindow.addEventListener("pagehide", () => {
        setPipOpen(false)
        pipWindowRef.current = null
        if (intervalRef.current) clearInterval(intervalRef.current)
      })
    } catch (e) {
      console.error("PiP failed:", e)
    }
  }, [updatePipContent])

  const closePip = useCallback(() => {
    pipWindowRef.current?.close()
    setPipOpen(false)
    pipWindowRef.current = null
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      pipWindowRef.current?.close()
    }
  }, [])

  return (
    <button
      onClick={pipOpen ? closePip : openPip}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        pipOpen
          ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
      title={pipOpen ? "Close PiP" : "Open Picture-in-Picture"}
    >
      {pipOpen ? <X className="h-3.5 w-3.5" /> : <MonitorPlay className="h-3.5 w-3.5" />}
      {pipOpen ? "Close PiP" : "PiP"}
    </button>
  )
}
