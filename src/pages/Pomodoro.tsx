import PomodoroTimer from "@/components/PomodoroTimer"

export default function Pomodoro() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-14">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pomodoro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Focused work sprints with breaks. Customize durations and enable auto-start to flow between sessions.
        </p>
      </div>
      <PomodoroTimer />
    </div>
  )
}
