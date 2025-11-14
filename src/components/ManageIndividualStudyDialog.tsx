import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle, Calendar as CalendarEditIcon, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const completeSchema = z.object({
  actual_start_time: z.string().min(1, "Hora de início é obrigatória"),
  actual_end_time: z.string().min(1, "Hora de término é obrigatória"),
  actual_study_notes: z.string().min(1, "Descreva o que foi estudado"),
});

const rescheduleSchema = z.object({
  event_date: z.date({
    required_error: "Data é obrigatória",
  }),
  event_time: z.string().min(1, "Hora é obrigatória"),
});

type ManageIndividualStudyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventDate: string;
  onSuccess?: () => void;
};

export const ManageIndividualStudyDialog = ({
  open,
  onOpenChange,
  eventId,
  eventDate,
  onSuccess,
}: ManageIndividualStudyDialogProps) => {
  const [loading, setLoading] = useState(false);

  const completeForm = useForm<z.infer<typeof completeSchema>>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      actual_start_time: "",
      actual_end_time: "",
      actual_study_notes: "",
    },
  });

  const rescheduleForm = useForm<z.infer<typeof rescheduleSchema>>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      event_time: "",
    },
  });

  const handleComplete = async (values: z.infer<typeof completeSchema>) => {
    try {
      setLoading(true);

      const today = new Date();
      const [startHours, startMinutes] = values.actual_start_time.split(":");
      const actualStart = new Date(today);
      actualStart.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

      const [endHours, endMinutes] = values.actual_end_time.split(":");
      const actualEnd = new Date(today);
      actualEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      if (actualEnd <= actualStart) {
        toast.error("Hora de término deve ser após hora de início");
        return;
      }

      const { error } = await supabase
        .from("events")
        .update({
          study_status: "completed",
          actual_start_time: actualStart.toISOString(),
          actual_end_time: actualEnd.toISOString(),
          actual_study_notes: values.actual_study_notes,
        })
        .eq("id", eventId);

      if (error) throw error;

      toast.success("Estudo realizado com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error completing study:", error);
      toast.error("Erro ao registrar estudo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async (values: z.infer<typeof rescheduleSchema>) => {
    try {
      setLoading(true);

      const [hours, minutes] = values.event_time.split(":");
      const newDateTime = new Date(values.event_date);
      newDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase
        .from("events")
        .update({
          event_date: newDateTime.toISOString(),
          study_status: "rescheduled",
        })
        .eq("id", eventId);

      if (error) throw error;

      toast.success("Estudo reagendado com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error rescheduling study:", error);
      toast.error("Erro ao reagendar estudo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      toast.success("Estudo cancelado");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error cancelling study:", error);
      toast.error("Erro ao cancelar estudo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Estudo Individual</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="complete" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="complete">
              <CheckCircle className="h-4 w-4 mr-1" />
              Realizar
            </TabsTrigger>
            <TabsTrigger value="reschedule">
              <CalendarEditIcon className="h-4 w-4 mr-1" />
              Reagendar
            </TabsTrigger>
            <TabsTrigger value="cancel">
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="complete">
            <Form {...completeForm}>
              <form onSubmit={completeForm.handleSubmit(handleComplete)} className="space-y-4">
                <FormField
                  control={completeForm.control}
                  name="actual_start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Início</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={completeForm.control}
                  name="actual_end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Término</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={completeForm.control}
                  name="actual_study_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>O que foi estudado</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o que você estudou..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Registrando..." : "Registrar Estudo"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="reschedule">
            <Form {...rescheduleForm}>
              <form onSubmit={rescheduleForm.handleSubmit(handleReschedule)} className="space-y-4">
                <FormField
                  control={rescheduleForm.control}
                  name="event_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Data</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP", { locale: ptBR })
                              ) : (
                                <span>Selecione a data</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={rescheduleForm.control}
                  name="event_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Hora</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Reagendando..." : "Reagendar Estudo"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="cancel">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja cancelar este estudo? Esta ação não pode ser desfeita.
              </p>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
