import { CalendarDays, Globe } from "lucide-react";
import { getCurrentTimeUTC7 } from "@/data/schedule";
import { useEffect, useState } from "react";
import PipButton from "./PipButton";

export default function ScheduleHeader() {
  const [time, setTime] = useState(getCurrentTimeUTC7());

  useEffect(() => {
    const iv = setInterval(() => setTime(getCurrentTimeUTC7()), 30000);
    return () => clearInterval(iv);
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Globe size={12} />
        <span>UTC+7</span>
        <span className="text-border">·</span>
        <CalendarDays size={12} />
        <span>{today}</span>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Daily Schedule
        </h1>
        <PipButton />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Optimized productivity blocks · Current time{" "}
        <span className="font-mono text-foreground">{time}</span>
      </p>
    </div>
  );
}
