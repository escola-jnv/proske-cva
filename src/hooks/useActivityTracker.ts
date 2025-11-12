import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to track user activity by updating last_active_at timestamp
 * Updates every 2 minutes while user is active
 */
export function useActivityTracker(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    // Update immediately on mount
    const updateActivity = async () => {
      try {
        await supabase
          .from("profiles")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", userId);
      } catch (error) {
        console.error("Error updating activity:", error);
      }
    };

    updateActivity();

    // Update every 2 minutes
    const interval = setInterval(updateActivity, 2 * 60 * 1000);

    // Update on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateActivity();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId]);
}
