import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onScheduled: () => void;
}

const TIME_SLOTS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
];

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  userId,
  onScheduled,
}: ScheduleInterviewDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const minDate = new Date();
  const maxDate = addDays(new Date(), 7);

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedDate(undefined);
      setSelectedTime("");
    }
    onOpenChange(newOpen);
  };

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Selecione uma data e horário");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("interview_schedules" as any).insert({
        user_id: userId,
        scheduled_date: format(selectedDate, "yyyy-MM-dd"),
        scheduled_time: selectedTime,
        status: "pending",
      } as any);

      if (error) throw error;

      toast.success("Entrevista agendada! Aguarde confirmação do professor.");
      setSelectedDate(undefined);
      setSelectedTime("");
      onScheduled();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error scheduling interview:", error);
      toast.error("Erro ao agendar entrevista");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agendar Entrevista Inicial</DialogTitle>
          <DialogDescription>
            Escolha um dia e horário nos próximos 7 dias para sua entrevista inicial.
            Um professor confirmará o horário com você.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label className="mb-2 block">Data da Entrevista</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < minDate || date > maxDate}
              locale={ptBR}
              className="rounded-md border"
            />
          </div>

          {selectedDate && (
            <div>
              <Label className="mb-2 block">Horário</Label>
              <div className="grid grid-cols-5 gap-2">
                {TIME_SLOTS.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!selectedDate || !selectedTime || loading}
            >
              {loading ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
