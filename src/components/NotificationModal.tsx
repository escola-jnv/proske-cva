import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import type { Notification } from "@/hooks/useNotifications";

interface NotificationModalProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (notificationId: string) => void;
}

export const NotificationModal = ({ notifications, isOpen, onClose, onMarkAsRead }: NotificationModalProps) => {
  const navigate = useNavigate();

  const handleAction = (notification: Notification) => {
    if (notification.action) {
      navigate(notification.action);
    }
    onMarkAsRead(notification.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Avisos Importantes
          </DialogTitle>
          <DialogDescription>
            Você tem {notifications.length} {notifications.length === 1 ? 'aviso pendente' : 'avisos pendentes'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {notifications.map((notification) => (
            <Card key={notification.id} className="p-4 border-l-4 border-l-destructive">
              <h3 className="font-semibold text-foreground mb-2">{notification.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{notification.description}</p>
              
              {notification.action && (
                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleAction(notification)}
                    size="sm"
                  >
                    Resolver agora
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
