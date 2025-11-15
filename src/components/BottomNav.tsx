import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, MessageCircle, Calendar, FileText, User, CreditCard, Users, DollarSign, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "visitor" | "student" | "teacher" | "admin" | "guest" | null;

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<UserRole>(null);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    setUserRole(userRoles?.role as UserRole || null);
  };

  const isActive = (path: string) => location.pathname === path;

  const getNavItems = () => {
    switch (userRole) {
      case "visitor":
        return [
          { path: "/communities", icon: MessageCircle, label: "Chat" },
          { path: "/plans", icon: CreditCard, label: "Assinatura" },
          { path: "/profile", icon: User, label: "Perfil" },
        ];
      
      case "student":
        return [
          { path: "/communities", icon: Home, label: "Início" },
          { path: "/tasks", icon: FileText, label: "Tarefas" },
          { path: "/communities", icon: MessageCircle, label: "Chat", highlighted: true },
          { path: "/events", icon: Calendar, label: "Eventos" },
          { path: "/profile", icon: User, label: "Perfil" },
        ];
      
      case "teacher":
        return [
          { path: "/communities", icon: Home, label: "Início" },
          { path: "/tasks", icon: FileText, label: "Tarefas" },
          { path: "/communities", icon: MessageCircle, label: "Chat" },
          { path: "/events", icon: Calendar, label: "Eventos" },
          { path: "/profile", icon: User, label: "Perfil" },
        ];
      
      case "admin":
        return [
          { path: "/communities", icon: MessageCircle, label: "Chat" },
          { path: "/tasks", icon: FileText, label: "Tarefas" },
          { path: "/events", icon: Calendar, label: "Eventos" },
          { path: "/profile", icon: User, label: "Perfil" },
          { path: "/crm", icon: Users, label: "CRM" },
          { path: "/financial", icon: DollarSign, label: "Financeiro" },
          { path: "/dev-tools", icon: Settings, label: "Dev Tools" },
        ];
      
      default:
        return [
          { path: "/communities", icon: Home, label: "Início" },
          { path: "/profile", icon: User, label: "Perfil" },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-inset-bottom z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const isHighlighted = 'highlighted' in item && item.highlighted;
          
          return (
            <button
              key={`${item.path}-${index}`}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center h-full space-y-1 transition-all ${
                isHighlighted
                  ? "flex-[1.5] -mt-4"
                  : "flex-1"
              } ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isHighlighted ? (
                <div className="flex flex-col items-center justify-center bg-primary rounded-full w-14 h-14 shadow-lg">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                  <span className="text-[10px] font-medium text-primary-foreground mt-0.5">{item.label}</span>
                </div>
              ) : (
                <>
                  <Icon className={`h-5 w-5 ${active ? "fill-primary" : ""}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
