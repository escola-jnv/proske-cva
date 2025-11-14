import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ScheduleInterviewDialog } from "./ScheduleInterviewDialog";
import { useInterviewSchedule } from "@/hooks/useInterviewSchedule";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface InterviewReminderDialogProps {
  userId: string | null;
}

export function InterviewReminderDialog({ userId }: InterviewReminderDialogProps) {
  const location = useLocation();
  const { hasScheduledInterview, isVisitor, loading, refresh } = useInterviewSchedule(userId);
  const [showReminder, setShowReminder] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    // Show reminder when route changes if visitor hasn't scheduled interview
    if (!loading && isVisitor && !hasScheduledInterview) {
      setShowReminder(true);
    } else {
      setShowReminder(false);
    }
  }, [location.pathname, loading, isVisitor, hasScheduledInterview]);

  const handleScheduleClick = () => {
    setShowReminder(false);
    setShowSchedule(true);
  };

  const handleScheduled = () => {
    setShowSchedule(false);
    // Refresh interview status to hide the popup
    refresh();
  };

  return (
    <>
      <Dialog open={showReminder} onOpenChange={setShowReminder}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-xl">Agende sua Entrevista Inicial</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Para ter acesso completo à plataforma, você precisa agendar uma entrevista
              inicial com um de nossos professores. Escolha um horário nos próximos 7 dias!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReminder(false)}>
              Depois
            </Button>
            <Button onClick={handleScheduleClick}>
              Agendar Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {userId && (
        <ScheduleInterviewDialog
          open={showSchedule}
          onOpenChange={setShowSchedule}
          userId={userId}
          onScheduled={handleScheduled}
        />
      )}
    </>
  );
}
