import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Notification = {
  id: string;
  message: string;
  title: string;
  description: string;
  action?: string;
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const checkNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url, city, monitoring_frequency, monitoring_day_of_week, monitoring_time")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const newNotifications: Notification[] = [];

      // Check for missing avatar
      if (!profile.avatar_url) {
        newNotifications.push({
          id: "avatar",
          message: "⚠️ Perfil Incompleto: Colocar foto de perfil",
          title: "Adicione sua foto de perfil",
          description: "Uma foto de perfil ajuda outros membros da comunidade a reconhecer você e torna sua experiência mais pessoal.",
          action: "/profile",
        });
      }

      // Check for missing city
      if (!profile.city) {
        newNotifications.push({
          id: "city",
          message: "⚠️ Perfil Incompleto: Informar cidade",
          title: "Informe sua cidade",
          description: "Adicionar sua cidade permite que você se conecte com outros membros da sua região e participe de eventos locais.",
          action: "/profile",
        });
      }

      // Check for missing monitoring schedule
      if (!profile.monitoring_frequency || profile.monitoring_day_of_week === null || !profile.monitoring_time) {
        newNotifications.push({
          id: "monitoring",
          message: "⚠️ Perfil Incompleto: Informar data e hora de monitoria",
          title: "Configure seu horário de monitoria",
          description: "Defina quando você prefere realizar suas monitorias para receber lembretes e manter uma rotina de estudos consistente.",
          action: "/profile",
        });
      }

      setNotifications(newNotifications);
    };

    checkNotifications();
    
    // Recheck every minute
    const interval = setInterval(checkNotifications, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return { notifications };
};
