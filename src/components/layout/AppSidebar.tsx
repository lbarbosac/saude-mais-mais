import { NavLink, useLocation } from "react-router-dom";
import {
  Home, CheckSquare, Headphones, BarChart3,
  User, Dumbbell, Trophy, Users,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  to: string;
  icon: React.ElementType;
  label: string;
};

const MAIN_NAV: NavItem[] = [
  { to: "/",         icon: Home,        label: "Início" },
  { to: "/habitos",  icon: CheckSquare, label: "Hábitos" },
  { to: "/treinos",  icon: Dumbbell,    label: "Treinos" },
  { to: "/sons",     icon: Headphones,  label: "Sons" },
  { to: "/progresso",icon: BarChart3,   label: "Progresso" },
];

const SOCIAL_NAV: NavItem[] = [
  { to: "/amigos",   icon: Users,  label: "Amigos" },
  { to: "/desafios", icon: Trophy, label: "Desafios" },
  { to: "/perfil",   icon: User,   label: "Perfil" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  function renderItem({ to, icon: Icon, label }: NavItem) {
    const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);

    return (
      <SidebarMenuItem key={to}>
        <SidebarMenuButton asChild tooltip={collapsed ? label : undefined}>
          <NavLink
            to={to}
            end={to === "/"}
            className={[
              "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
              isActive
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
            {!collapsed && <span className="text-sm">{label}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        {/* Logo */}
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
            <SidebarMenu>{MAIN_NAV.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Social</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{SOCIAL_NAV.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
