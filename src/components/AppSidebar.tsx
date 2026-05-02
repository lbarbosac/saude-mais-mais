import { NavLink, useLocation } from "react-router-dom";
import { Home, CheckSquare, Headphones, BarChart3, User, Dumbbell, Trophy, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/habitos", icon: CheckSquare, label: "Hábitos" },
  { to: "/treinos", icon: Dumbbell, label: "Treinos" },
  { to: "/sons", icon: Headphones, label: "Sons" },
  { to: "/progresso", icon: BarChart3, label: "Progresso" },
];

const socialItems = [
  { to: "/amigos", icon: Users, label: "Amigos" },
  { to: "/desafios", icon: Trophy, label: "Desafios" },
  { to: "/perfil", icon: User, label: "Perfil" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const renderItem = (item: typeof mainItems[0]) => {
    const isActive =
      item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
    return (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton asChild tooltip={collapsed ? item.label : undefined}>
          <NavLink
            to={item.to}
            end={item.to === "/"}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        <div className="flex items-center gap-2 px-4 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-calm">
            <span className="text-sm font-bold text-primary-foreground">S+</span>
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-sidebar-foreground">Saúde++</p>
              <p className="text-[10px] text-muted-foreground">bem-estar diário</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{mainItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Social</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{socialItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
