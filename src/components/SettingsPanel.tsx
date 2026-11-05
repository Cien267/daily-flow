import type { LucideIcon } from "lucide-react";
import { Settings as SettingsIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { ACCENTS, useAccentColor } from "@/hooks/useAccent";
import {
  useNavSettings,
  NAV_TABS,
  type NavTabKey,
} from "@/hooks/useNavSettings";
import { Switch } from "@/components/ui/switch";

/**
 * Shared settings body used by the desktop Popover and the mobile Dialog.
 * Kept presentation-only so both containers stay consistent.
 */
export function SettingsPanel({
  itemIcons: icons,
}: {
  itemIcons: Record<NavTabKey, typeof SettingsIcon>;
}) {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccentColor();
  const { visible, setVisibleTab } = useNavSettings();

  return (
    <div className="space-y-4">
      <div className="px-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <SettingsIcon className="h-4 w-4 text-muted-foreground" />
          Settings
        </p>
        <p className="text-xs text-muted-foreground">
          Theme, accent color and menu sections.
        </p>
      </div>

      <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
        Theme
      </p>
      <div className="grid grid-cols-3 gap-1">
        {(
          [
            { key: "light", label: "Light" },
            { key: "dark", label: "Dark" },
            { key: "system", label: "System" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setTheme(opt.key)}
            className={`rounded-md border px-2 py-2 text-xs transition-colors ${
              theme === opt.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
        Accent color
      </p>
      <div className="flex items-center gap-2 px-1">
        {ACCENTS.map((a) => (
          <button
            key={a.key}
            onClick={() => setAccent(a.key)}
            title={a.label}
            aria-label={`${a.label} accent`}
            aria-pressed={accent === a.key}
            className={`h-7 w-7 rounded-full transition-transform ${
              accent === a.key
                ? "scale-110 ring-2 ring-ring ring-offset-2 ring-offset-background"
                : "hover:scale-105"
            }`}
            style={{ backgroundColor: a.swatch }}
          />
        ))}
      </div>

      <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
        Menu sections
      </p>
      <div className="space-y-1">
        {NAV_TABS.map((tab) => {
          const Icon = icons[tab.key];
          return (
            <div
              key={tab.key}
              className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm leading-tight">{tab.label}</span>
                <span className="block text-xs text-muted-foreground leading-tight">
                  {tab.description}
                </span>
              </span>
              <Switch
                checked={visible[tab.key]}
                onCheckedChange={(v) => setVisibleTab(tab.key, v)}
                aria-label={`Show ${tab.label}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
