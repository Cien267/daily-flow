import { categoryConfig, Category } from "@/data/schedule";
import {
  Coffee, Brain, Briefcase, Leaf, Rocket, Heart,
  BookOpen, Radio, Sparkles
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Coffee, Brain, Briefcase, Leaf, Rocket, Heart, BookOpen, Radio, Sparkles,
};

export default function Legend() {
  return (
    <div className="flex flex-wrap gap-3">
      {(Object.entries(categoryConfig) as [Category, typeof categoryConfig[Category]][]).map(
        ([key, cfg]) => {
          const Icon = iconMap[cfg.icon];
          return (
            <div
              key={key}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground"
            >
              <div
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: `hsl(var(${cfg.cssVar}))` }}
              />
              <span>{cfg.label}</span>
            </div>
          );
        }
      )}
    </div>
  );
}
