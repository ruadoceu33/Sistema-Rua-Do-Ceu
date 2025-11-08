import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";
import { HandHeart } from "lucide-react";
import { Outlet } from "react-router-dom";

interface AppLayoutProps {
  className?: string;
}

export function AppLayout({ className }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Mobile Header with menu trigger */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 lg:hidden">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <div className="gradient-primary rounded-lg p-1.5">
                <HandHeart className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-sm">Sistema Rua do Céu</span>
            </div>
          </header>

          <main className={cn(
            "flex-1 p-4 md:p-6 lg:p-8 space-y-6",
            "animate-fade-in",
            className
          )}>
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}