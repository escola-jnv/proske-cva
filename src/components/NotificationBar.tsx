import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationModal } from "./NotificationModal";

export const NotificationBar = () => {
  const { notifications, markAsRead } = useNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (notifications.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="sticky top-0 z-50 relative h-10 bg-destructive overflow-hidden border-b border-border w-full cursor-pointer hover:bg-destructive/90 transition-colors"
      >
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="flex gap-8 animate-scroll whitespace-nowrap">
            {/* Duplicate notifications for seamless loop */}
            {[...notifications, ...notifications].map((notification, index) => (
              <span
                key={`${notification.id}-${index}`}
                className="text-destructive-foreground px-4"
              >
                {notification.message}
              </span>
            ))}
          </div>
        </div>
      </button>

      <NotificationModal
        notifications={notifications}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onMarkAsRead={markAsRead}
      />
    </>
  );
};
