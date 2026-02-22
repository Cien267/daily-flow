import { useState } from "react";
import {
  Coffee, Brain, Briefcase, Leaf, Rocket, Heart,
  BookOpen, Radio, Sparkles, Moon, Zap, Clock
} from "lucide-react";
import {
  ScheduleBlock, categoryConfig, energyMap,
  getDurationMinutes, formatDuration, getCurrentProgress, getCurrentBlockIndex, schedule
} from "@/data/schedule";

const iconMap: Record<string, React.ElementType> = {
  Coffee, Brain, Briefcase, Leaf, Rocket, Heart, BookOpen, Radio, Sparkles,
};

interface Props {
  block: ScheduleBlock;
  index: number;
  isCurrent: boolean;
}

export default function TimelineBlock({ block, index, isCurrent }: Props) {
  const [hovered, setHovered] = useState(false);
  const cat = categoryConfig[block.category];
  const energy = energyMap[block.energy_level];
  const duration = getDurationMinutes(block.start, block.end);
  const progress = isCurrent ? getCurrentProgress(block) : 0;
  const Icon = iconMap[cat.icon] || Moon;
  const isSleep = block.category === "health" && block.energy_level === "restore";
  const isDeep = block.focus_type === "deep" || block.focus_type === "focused";

  return (
    <div
      className="group relative flex gap-4 md:gap-6"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Time column */}
      <div className="w-16 md:w-20 shrink-0 pt-3 text-right">
        <span className="font-mono text-sm text-muted-foreground">{block.start}</span>
      </div>

      {/* Timeline dot & line */}
      <div className="relative flex flex-col items-center">
        <div
          className="z-10 mt-3 h-3 w-3 rounded-full border-2 transition-transform duration-200"
          style={{
            borderColor: `hsl(var(${cat.cssVar}))`,
            backgroundColor: isCurrent ? `hsl(var(${cat.cssVar}))` : "hsl(var(--background))",
            transform: isCurrent ? "scale(1.4)" : hovered ? "scale(1.2)" : "scale(1)",
          }}
        />
        {index < schedule.length - 1 && (
          <div className="w-px flex-1 bg-border" />
        )}
      </div>

      {/* Card */}
      <div
        className={`mb-3 flex-1 rounded-lg border p-4 transition-all duration-200 ${
          isCurrent
            ? "border-primary/40 bg-card shadow-lg shadow-primary/5"
            : isSleep
            ? "border-border/50 bg-muted/30 opacity-60"
            : "border-border bg-card hover:border-muted-foreground/20 hover:bg-accent/50"
        } ${isDeep && !isCurrent ? "border-l-2" : ""}`}
        style={isDeep && !isCurrent ? { borderLeftColor: `hsl(var(${cat.cssVar}))` } : {}}
      >
        {/* Progress bar for current */}
        {isCurrent && (
          <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress}%`,
                backgroundColor: `hsl(var(${cat.cssVar}))`,
              }}
            />
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: `hsl(var(${cat.cssVar}) / 0.12)` }}
            >
              <Icon size={16} style={{ color: `hsl(var(${cat.cssVar}))` }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-tight text-foreground">
                {block.title}
              </h3>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock size={10} />
                <span className="font-mono">
                  {block.start}–{block.end ?? "∞"}
                </span>
                <span className="text-border">·</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>
          </div>

          {/* Energy indicator */}
          <div className="flex shrink-0 items-center gap-1.5">
            <Zap size={12} style={{ color: `hsl(var(${energy.cssVar}))` }} />
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${energy.percent}%`,
                  backgroundColor: `hsl(var(${energy.cssVar}))`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Description - shown on hover or if current */}
        <div
          className={`overflow-hidden transition-all duration-200 ${
            hovered || isCurrent ? "mt-2.5 max-h-20 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <p className="text-xs leading-relaxed text-muted-foreground">
            {block.description}
          </p>
          {block.focus_type !== "none" && (
            <span
              className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
              style={{
                backgroundColor: `hsl(var(${cat.cssVar}) / 0.1)`,
                color: `hsl(var(${cat.cssVar}))`,
              }}
            >
              {block.focus_type}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
