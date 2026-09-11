import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="min-h-12 flex items-center border-b border-border px-3 sticky top-0 z-10 bg-background/80 backdrop-blur pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2">
            <SidebarTrigger />
            <span className="ml-3 text-xs text-muted-foreground font-mono">focus.suite</span>
          </header>
          <main className="flex-1 min-w-0 pb-[env(safe-area-inset-bottom)]">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
