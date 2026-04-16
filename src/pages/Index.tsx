import { useEffect, useState } from "react"
import { schedule, getCurrentBlockIndex } from "@/data/schedule"
import TimelineBlock from "@/components/TimelineBlock"
import Legend from "@/components/Legend"
import ScheduleHeader from "@/components/ScheduleHeader"
import PomodoroTimer from "@/components/PomodoroTimer"

const Index = () => {
  const [currentIdx, setCurrentIdx] = useState(getCurrentBlockIndex(schedule))

  useEffect(() => {
    const iv = setInterval(
      () => setCurrentIdx(getCurrentBlockIndex(schedule)),
      60000,
    )
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
        <ScheduleHeader />
        <PomodoroTimer />
        <Legend />

        <div className="mt-8">
          {schedule.map((block, i) => (
            <TimelineBlock
              key={block.start}
              block={block}
              index={i}
              isCurrent={i === currentIdx}
            />
          ))}
        </div>

        <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          {schedule.length} blocks · 07:00 – 23:30 · Designed for deep focus
        </div>
      </div>
    </div>
  )
}

export default Index
