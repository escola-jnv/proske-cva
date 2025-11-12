import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Notification } from "@/hooks/useNotifications";

interface NotificationModalProps {
  notification: Notification | null;
  onClose: () => void;
}

export const NotificationModal = ({ notification, onClose }: NotificationModalProps) => {
  const navigate = useNavigate();

  if (!notification) return null;

  const handleAction = () => {
    if (notification.action) {
      navigate(notification.action);
      onClose();
    }
  };

  return (
    <Dialog open={!!notification} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{notification.title}</DialogTitle>
          <DialogDescription>{notification.description}</DialogDescription>
        </DialogHeader>
        
        {notification.action && (
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={handleAction}>
              Resolver agora
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
