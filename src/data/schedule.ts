export type Category = "personal" | "growth" | "work" | "recovery" | "business" | "health" | "learning" | "work-flex" | "reflection";
export type EnergyLevel = "warm_up" | "peak" | "high" | "medium_high" | "medium" | "low" | "active" | "cooldown" | "recovery" | "sleep_prep" | "restore";
export type FocusType = "none" | "deep" | "focused" | "creative" | "body" | "learning" | "reactive" | "light";

export interface ScheduleBlock {
  start: string;
  end: string | null;
  title: string;
  category: Category;
  description: string;
  energy_level: EnergyLevel;
  focus_type: FocusType;
  task_style?: string;
}

export const schedule: ScheduleBlock[] = [
  { start: "07:00", end: "07:30", title: "Wake Start", category: "personal", description: "Morning routine, hygiene, coffee, light exposure", energy_level: "warm_up", focus_type: "none" },
  { start: "07:30", end: "09:00", title: "Deep Study", category: "growth", description: "Study technical skills, backend, system design, advanced programming concepts", energy_level: "peak", focus_type: "deep" },
  { start: "09:00", end: "11:30", title: "Remote Work Block", category: "work", description: "Primary remote job tasks, coding, collaboration, async communication", energy_level: "high", focus_type: "focused" },
  { start: "11:30", end: "13:00", title: "Lunch + Break", category: "recovery", description: "Cook, eat, rest, short nap", energy_level: "recovery", focus_type: "none" },
  { start: "13:00", end: "15:00", title: "Build Block", category: "business", description: "Side project, startup building, product development, feature implementation", energy_level: "medium_high", focus_type: "creative" },
  { start: "15:00", end: "15:30", title: "Workout", category: "health", description: "Daily physical training", energy_level: "active", focus_type: "body" },
  { start: "15:30", end: "16:00", title: "Reset", category: "recovery", description: "Shower, relaxation, nervous system reset", energy_level: "cooldown", focus_type: "none" },
  { start: "16:00", end: "17:30", title: "Skill Growth", category: "learning", description: "English practice, reading, listening, skill expansion", energy_level: "medium", focus_type: "learning" },
  { start: "17:30", end: "19:30", title: "Dinner + Rest", category: "personal", description: "Cook dinner, eat, relax", energy_level: "low", focus_type: "none" },
  { start: "19:30", end: "22:30", title: "Remote Standby Mode", category: "work-flex", description: "Check messages, meetings, PR review, quick fixes, research, brainstorming, podcasts, finance learning", energy_level: "low", focus_type: "reactive", task_style: "microtasks" },
  { start: "22:30", end: "22:45", title: "Daily Review", category: "reflection", description: "Review day, track progress, plan tomorrow", energy_level: "low", focus_type: "light" },
  { start: "22:45", end: "23:15", title: "Wind Down", category: "recovery", description: "Relax without screens, reading, stretching", energy_level: "sleep_prep", focus_type: "none" },
  { start: "23:30", end: null, title: "Sleep", category: "health", description: "Sleep and full recovery", energy_level: "restore", focus_type: "none" },
];

export const categoryConfig: Record<Category, { label: string; icon: string; cssVar: string }> = {
  personal: { label: "Personal", icon: "Coffee", cssVar: "--cat-personal" },
  growth: { label: "Deep Growth", icon: "Brain", cssVar: "--cat-growth" },
  work: { label: "Work", icon: "Briefcase", cssVar: "--cat-work" },
  recovery: { label: "Recovery", icon: "Leaf", cssVar: "--cat-recovery" },
  business: { label: "Business", icon: "Rocket", cssVar: "--cat-business" },
  health: { label: "Health", icon: "Heart", cssVar: "--cat-health" },
  learning: { label: "Learning", icon: "BookOpen", cssVar: "--cat-learning" },
  "work-flex": { label: "Standby", icon: "Radio", cssVar: "--cat-work-flex" },
  reflection: { label: "Reflection", icon: "Sparkles", cssVar: "--cat-reflection" },
};

export const energyMap: Record<EnergyLevel, { label: string; cssVar: string; percent: number }> = {
  peak: { label: "Peak", cssVar: "--energy-peak", percent: 100 },
  high: { label: "High", cssVar: "--energy-high", percent: 85 },
  active: { label: "Active", cssVar: "--energy-active", percent: 80 },
  medium_high: { label: "Med-High", cssVar: "--energy-medium-high", percent: 70 },
  medium: { label: "Medium", cssVar: "--energy-medium", percent: 55 },
  warm_up: { label: "Warm Up", cssVar: "--energy-warmup", percent: 40 },
  cooldown: { label: "Cooldown", cssVar: "--energy-cooldown", percent: 35 },
  low: { label: "Low", cssVar: "--energy-low", percent: 30 },
  recovery: { label: "Recovery", cssVar: "--energy-recovery", percent: 25 },
  sleep_prep: { label: "Wind Down", cssVar: "--energy-sleep-prep", percent: 15 },
  restore: { label: "Restore", cssVar: "--energy-restore", percent: 5 },
};

export function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function getDurationMinutes(start: string, end: string | null): number {
  if (!end) return 60;
  return parseTime(end) - parseTime(start);
}

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getCurrentBlockIndex(blocks: ScheduleBlock[]): number {
  const now = new Date();
  // Use UTC+7
  const utc7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const currentMinutes = utc7.getUTCHours() * 60 + utc7.getUTCMinutes();
  
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (currentMinutes >= parseTime(blocks[i].start)) return i;
  }
  return -1;
}

export function getCurrentProgress(block: ScheduleBlock): number {
  const now = new Date();
  const utc7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const currentMinutes = utc7.getUTCHours() * 60 + utc7.getUTCMinutes();
  const start = parseTime(block.start);
  const duration = getDurationMinutes(block.start, block.end);
  return Math.min(100, Math.max(0, ((currentMinutes - start) / duration) * 100));
}

export function getCurrentTimeUTC7(): string {
  const now = new Date();
  const utc7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return `${String(utc7.getUTCHours()).padStart(2, "0")}:${String(utc7.getUTCMinutes()).padStart(2, "0")}`;
}
