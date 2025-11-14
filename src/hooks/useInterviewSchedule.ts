import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useInterviewSchedule(userId: string | null) {
  const [hasScheduledInterview, setHasScheduledInterview] = useState(true); // Default to true to avoid showing popup during loading
  const [isVisitor, setIsVisitor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkInterviewSchedule = async () => {
      try {
        // Check if user is a visitor
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        const isUserVisitor = roles?.some((r) => r.role === "visitor" as any) || false;
        setIsVisitor(isUserVisitor);

        if (!isUserVisitor) {
          setHasScheduledInterview(true);
          setLoading(false);
          return;
        }

        // Check if visitor has scheduled an interview
        const { data: schedules } = await supabase
          .from("interview_schedules" as any)
          .select("id, status")
          .eq("user_id", userId)
          .in("status", ["pending", "confirmed"]) as any;

        setHasScheduledInterview((schedules?.length || 0) > 0);
      } catch (error) {
        console.error("Error checking interview schedule:", error);
        setHasScheduledInterview(true); // Don't show popup on error
      } finally {
        setLoading(false);
      }
    };

    checkInterviewSchedule();
  }, [userId]);

  return { hasScheduledInterview, isVisitor, loading };
}
