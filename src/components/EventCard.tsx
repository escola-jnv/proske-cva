import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, Check, X, Edit } from "lucide-react";
import { toast } from "sonner";
import { format, isPast, isToday, isTomorrow, isThisWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditEventDialog } from "./EditEventDialog";

type EventCardProps = {
  event: {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    duration_minutes: number;
    group_names?: string[];
    my_status?: string;
    created_by?: string;
    community_id?: string;
  };
  userId: string;
  userRoles?: string[];
  onUpdate?: () => void;
};

export const EventCard = ({ event, userId, userRoles = [], onUpdate }: EventCardProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const eventDate = new Date(event.event_date);
  const isPastEvent = isPast(eventDate);
  
  const canEdit = !isPastEvent && (
    event.created_by === userId || 
    userRoles.includes('teacher') || 
    userRoles.includes('admin')
  );

  const getDateLabel = () => {
    if (isToday(eventDate)) return "Hoje";
    if (isTomorrow(eventDate)) return "Amanhã";
    if (isThisWeek(eventDate)) return format(eventDate, "EEEE", { locale: ptBR });
    return format(eventDate, "dd/MM/yyyy");
  };

  const getStatusBadge = () => {
    if (isPastEvent) {
      return <Badge variant="secondary">Finalizado</Badge>;
    }
    
    switch (event.my_status) {
      case "accepted":
        return <Badge className="bg-green-500 hover:bg-green-600">Confirmado</Badge>;
      case "declined":
        return <Badge variant="destructive">Recusado</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const handleUpdateStatus = async (status: "accepted" | "declined") => {
    try {
      const { error } = await supabase
        .from("event_participants")
        .update({ status })
        .eq("event_id", event.id)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success(
        status === "accepted"
          ? "Presença confirmada!"
          : "Presença recusada"
      );
      onUpdate?.();
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  };

  return (
    <>
      <Card className="p-4 hover:bg-accent/50 transition-colors">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{event.title}</h3>
              {event.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {event.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {getStatusBadge()}
            </div>
          </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{getDateLabel()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>
              {format(eventDate, "HH:mm")} ({event.duration_minutes} min)
            </span>
          </div>
        </div>

        {event.group_names && event.group_names.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.group_names.map((name, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {name}
              </Badge>
            ))}
          </div>
        )}

        {!isPastEvent && event.my_status !== "accepted" && event.my_status !== "declined" && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => handleUpdateStatus("accepted")}
            >
              <Check className="h-4 w-4" />
              Confirmar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => handleUpdateStatus("declined")}
            >
              <X className="h-4 w-4" />
              Recusar
            </Button>
          </div>
        )}
        </div>
      </Card>

      {canEdit && event.community_id && (
        <EditEventDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          eventId={event.id}
          communityId={event.community_id}
          userId={userId}
          onSuccess={onUpdate}
        />
      )}
    </>
  );
};
