import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useInterviewSchedule(userId: string | null) {
  const [hasScheduledInterview, setHasScheduledInterview] = useState(true); // Default to true to avoid showing popup during loading
  const [isVisitor, setIsVisitor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const checkInterviewSchedule = async () => {
    console.log("useInterviewSchedule - checking for userId:", userId);
    if (!userId) {
      console.log("useInterviewSchedule - no userId, setting loading to false");
      setLoading(false);
      return;
    }

    try {
      // Check if user is a visitor
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      console.log("useInterviewSchedule - user roles:", roles);

      const isUserVisitor = roles?.some((r) => r.role === "visitor" as any) || false;
      console.log("useInterviewSchedule - isUserVisitor:", isUserVisitor);
      setIsVisitor(isUserVisitor);

      if (!isUserVisitor) {
        console.log("useInterviewSchedule - not a visitor, hiding popup");
        setHasScheduledInterview(true);
        setLoading(false);
        return;
      }

      // Check if visitor has scheduled an interview
      const { data: schedules } = await supabase
        .from("interview_schedules")
        .select("id, status")
        .eq("user_id", userId)
        .in("status", ["pending", "confirmed"]);

      console.log("useInterviewSchedule - schedules:", schedules);

      const hasScheduled = (schedules?.length || 0) > 0;
      console.log("useInterviewSchedule - hasScheduled:", hasScheduled);
      setHasScheduledInterview(hasScheduled);
    } catch (error) {
      console.error("Error checking interview schedule:", error);
      setHasScheduledInterview(true); // Don't show popup on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkInterviewSchedule();
  }, [userId, refreshKey]);

  const refresh = () => {
    console.log("useInterviewSchedule - refreshing");
    setRefreshKey(prev => prev + 1);
  };

  return { hasScheduledInterview, isVisitor, loading, refresh };
}
