import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationModal } from "./NotificationModal";
import type { Notification } from "@/hooks/useNotifications";

export const NotificationBar = () => {
  const { notifications } = useNotifications();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  if (notifications.length === 0) return null;

  return (
    <>
      <div className="relative h-10 bg-destructive overflow-hidden border-b border-border">
        <div className="absolute inset-0 flex items-center">
          <div className="flex gap-8 animate-scroll whitespace-nowrap">
            {/* Duplicate notifications for seamless loop */}
            {[...notifications, ...notifications].map((notification, index) => (
              <button
                key={`${notification.id}-${index}`}
                onClick={() => setSelectedNotification(notification)}
                className="text-destructive-foreground hover:underline px-4 transition-colors"
              >
                {notification.message}
              </button>
            ))}
          </div>
        </div>
      </div>

      <NotificationModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
      />
    </>
  );
};
