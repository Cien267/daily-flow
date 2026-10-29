import { NavLink, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Calendar,
  Timer,
  Eye,
  CheckSquare,
  StickyNote,
  LogOut,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ACCENTS, useAccentColor } from "@/hooks/useAccent";
import {
  useNavSettings,
  NAV_TABS,
  type NavTabKey,
} from "@/hooks/useNavSettings";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const itemIcons: Record<NavTabKey, typeof Calendar> = {
  schedule: Calendar,
  pomodoro: Timer,
  "eye-care": Eye,
  tasks: CheckSquare,
  notes: StickyNote,
};

const itemUrls: Record<NavTabKey, string> = {
  schedule: "/",
  pomodoro: "/pomodoro",
  "eye-care": "/eye-care",
  tasks: "/tasks",
  notes: "/notes",
};

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { visible, setVisibleTab } = useNavSettings();
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccentColor();
  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const items = NAV_TABS.filter((t) => visible[t.key]).map((t) => ({
    title: t.label,
    url: itemUrls[t.key],
    icon: itemIcons[t.key],
  }));

  // When the active page is hidden, keep it highlighted via route anyway.
  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-[env(safe-area-inset-top)]">
        <SidebarGroup>
          <SidebarGroupLabel>{collapsed ? "" : "Focus Suite"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-2"
                      onClick={() => setOpenMobile(false)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
        <SidebarMenu>
          <SidebarMenuItem>
            <Popover>
              <PopoverTrigger asChild>
                <SidebarMenuButton tooltip="Settings">
                  <Settings className="h-4 w-4" />
                  {!collapsed && <span>Settings</span>}
                </SidebarMenuButton>
              </PopoverTrigger>
              <PopoverContent
                side="right"
                align="start"
                sideOffset={8}
                className="w-72 p-3"
              >
                <div className="mb-1 px-1">
                  <p className="text-sm font-medium">Settings</p>
                  <p className="text-xs text-muted-foreground">
                    Theme, accent color and menu sections.
                  </p>
                </div>

                <p className="mt-3 mb-1.5 px-1 text-xs font-medium text-muted-foreground">
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
                      className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                        theme === opt.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <p className="mt-3 mb-1.5 px-1 text-xs font-medium text-muted-foreground">
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
                      className={`h-6 w-6 rounded-full transition-transform ${
                        accent === a.key
                          ? "scale-110 ring-2 ring-ring ring-offset-2 ring-offset-background"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: a.swatch }}
                    />
                  ))}
                </div>

                <p className="mt-3 mb-1.5 px-1 text-xs font-medium text-muted-foreground">
                  Menu sections
                </p>
                <div className="space-y-1">
                  {NAV_TABS.map((tab) => {
                    const Icon = itemIcons[tab.key];
                    return (
                      <div
                        key={tab.key}
                        className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm leading-tight">
                            {tab.label}
                          </span>
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
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sign out">
              <LogOut className="h-4 w-4" />
              {!collapsed && (
                <span className="truncate">{user?.email ?? "Sign out"}</span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
