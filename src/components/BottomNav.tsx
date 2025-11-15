import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Users, Calendar, FileText, User, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isTeacherOrAdmin, setIsTeacherOrAdmin] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasAccess = userRoles?.some(
      (r) => r.role === "teacher" || r.role === "admin"
    );
    setIsTeacherOrAdmin(hasAccess || false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/communities", icon: Home, label: "Início" },
    ...(isTeacherOrAdmin ? [{ path: "/crm", icon: Users, label: "CRM" }] : []),
    { path: "/events", icon: Calendar, label: "Eventos" },
    { path: "/tasks", icon: FileText, label: "Tarefas" },
    { path: "/profile", icon: User, label: "Perfil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-inset-bottom z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "fill-primary" : ""}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
