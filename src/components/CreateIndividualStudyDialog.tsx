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
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formSchema = z.object({
  event_date: z.date({
    required_error: "Data é obrigatória",
  }),
  event_time: z.string().min(1, "Hora é obrigatória"),
  duration_minutes: z.coerce.number().min(15, "Duração mínima de 15 minutos"),
  study_topic: z.string().min(1, "Tópico de estudo é obrigatório"),
});

type CreateIndividualStudyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  communityId: string;
  onSuccess?: () => void;
};

export const CreateIndividualStudyDialog = ({
  open,
  onOpenChange,
  userId,
  communityId,
  onSuccess,
}: CreateIndividualStudyDialogProps) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      duration_minutes: 60,
      study_topic: "",
      event_time: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);

      // Combine date and time
      const [hours, minutes] = values.event_time.split(":");
      const eventDateTime = new Date(values.event_date);
      eventDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Create individual study event
      const { error } = await supabase.from("events").insert({
        title: "Estudo Individual",
        description: values.study_topic,
        event_date: eventDateTime.toISOString(),
        duration_minutes: values.duration_minutes,
        event_type: "individual_study",
        study_topic: values.study_topic,
        study_status: "pending",
        created_by: userId,
        community_id: communityId,
      });

      if (error) throw error;

      toast.success("Estudo individual criado com sucesso!");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating individual study:", error);
      toast.error("Erro ao criar estudo individual: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Estudo Individual</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="event_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
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
              control={form.control}
              name="event_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração (minutos)</FormLabel>
                  <FormControl>
                    <Input type="number" min="15" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="study_topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>O que será estudado</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o tópico de estudo..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Criando..." : "Criar Estudo"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
