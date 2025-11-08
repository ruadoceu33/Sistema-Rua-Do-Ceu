import { 
  Calendar,
  Gift,
  MapPin,
  Users,
  UserCheck,
  BarChart3,
  Settings,
  HandHeart,
  Home,
  Building2,
  LogOut,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserInfoCard } from "@/components/ui/user-info-card";
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
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

const mainMenuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Aniversários", url: "/aniversarios", icon: Calendar },
  { title: "Crianças", url: "/criancas", icon: Users },
  { title: "Doações", url: "/doacoes", icon: Gift },
  { title: "Check-in", url: "/checkin", icon: UserCheck },
];

const managementItems = [
  { title: "Locais", url: "/locais", icon: MapPin, adminOnly: true },
  { title: "Colaboradores", url: "/colaboradores", icon: Building2, adminOnly: true },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
];

export function AppSidebar({ className, ...props }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isAdmin } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Sidebar 
      className={cn("border-sidebar-border", className)} 
      collapsible="icon"
      {...props}
    >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="gradient-primary rounded-lg p-2">
            <HandHeart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-sidebar-foreground">
              Sistema Rua do Céu
            </h2>
            <p className="text-sm text-sidebar-foreground/70">
              Gestão de Doações
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <UserInfoCard />
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-medium uppercase tracking-wider mb-2">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className={cn(
                      "transition-smooth hover:bg-sidebar-accent focus-ring",
                      isActive(item.url) && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                    )}
                  >
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-3 h-10 px-3"
                      onClick={() => navigate(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.title}</span>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-medium uppercase tracking-wider mb-2">
            Gerenciamento
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems
                .filter(item => !item.adminOnly || isAdmin)
                .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className={cn(
                      "transition-smooth hover:bg-sidebar-accent focus-ring",
                      isActive(item.url) && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                    )}
                  >
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-3 h-10 px-3"
                      onClick={() => navigate(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.title}</span>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center gap-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent h-auto p-3"
            >
              <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-xs font-medium">
                  {profile?.nome?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sidebar-foreground">
                  {profile?.nome || 'Usuário'}
                </p>
                <p className="text-xs">
                  {profile?.role === 'admin' ? 'Administrador' : 'Colaborador'}
                </p>
              </div>
              <ChevronUp className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width]"
            side="top"
            align="start"
          >
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}