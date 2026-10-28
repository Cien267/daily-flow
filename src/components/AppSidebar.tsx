import { NavLink, useLocation } from "react-router-dom";
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
                    Show or hide sections in the menu.
                  </p>
                </div>
                <div className="mt-2 space-y-1">
                  {NAV_TABS.map((tab) => {
                    const Icon = itemIcons[tab.key];
                    return (
                      <label
                        key={tab.key}
                        className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent cursor-pointer"
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
                          onClick={(e) => e.preventDefault()}
                        />
                      </label>
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
