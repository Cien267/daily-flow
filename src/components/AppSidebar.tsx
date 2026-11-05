import { useEffect, useState } from "react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { SettingsPanel } from "@/components/SettingsPanel";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const isMobile = useIsMobile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { visible } = useNavSettings();
  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  // Keep the mobile browser / PWA status bar in sync with the theme.
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolvedTheme === "light" ? "#ffffff" : "#0f172a");
  }, [resolvedTheme]);

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
            {isMobile ? (
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <SidebarMenuButton tooltip="Settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </DialogTrigger>
                <DialogContent className="max-h-[85dvh] overflow-y-auto p-4">
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                      Theme, accent color and menu sections.
                    </DialogDescription>
                  </DialogHeader>
                  <SettingsPanel itemIcons={itemIcons} />
                </DialogContent>
              </Dialog>
            ) : (
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
                  className="w-72 max-h-[80vh] overflow-y-auto p-3"
                >
                  <SettingsPanel itemIcons={itemIcons} />
                </PopoverContent>
              </Popover>
            )}
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
