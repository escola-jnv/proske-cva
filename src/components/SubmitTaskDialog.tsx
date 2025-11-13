import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

const formSchema = z.object({
  video_url: z.string().url("URL inválida").refine(
    (url) => url.includes("youtube.com") || url.includes("youtu.be"),
    "Deve ser um link do YouTube"
  ),
  recording_date: z.string().min(1, "Data obrigatória"),
  task_name: z.string().min(3, "Nome da tarefa deve ter pelo menos 3 caracteres"),
  song_name: z.string().min(1, "Nome da música é obrigatório"),
  harmonic_field: z.string().min(1, "Campo Harmônico é obrigatório"),
  effective_key: z.string().min(1, "Tom Efetivo é obrigatório"),
  bpm: z.string().min(1, "BPM é obrigatório"),
  melodic_reference: z.string().min(1, "Referência melódica é obrigatória"),
  extra_notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitTaskDialogProps {
  communityId: string;
}

export const SubmitTaskDialog = ({ communityId }: SubmitTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      video_url: "",
      recording_date: "",
      task_name: "",
      song_name: "",
      harmonic_field: "",
      effective_key: "",
      bpm: "",
      melodic_reference: "",
      extra_notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("submissions").insert({
        community_id: communityId,
        student_id: user.id,
        video_url: values.video_url,
        recording_date: values.recording_date,
        task_name: values.task_name,
        song_name: values.song_name,
        harmonic_field: values.harmonic_field,
        effective_key: values.effective_key,
        bpm: parseInt(values.bpm),
        melodic_reference: values.melodic_reference,
        extra_notes: values.extra_notes || null,
      });

      if (error) throw error;

      toast({
        title: "Tarefa enviada!",
        description: "Sua tarefa foi enviada para correção.",
      });

      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar tarefa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Enviar Tarefa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Tarefa para Correção</DialogTitle>
          <DialogDescription>
            Preencha as informações da sua tarefa para enviar ao professor.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="task_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Tarefa</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Monitoria 01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="song_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Música</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Garota de Ipanema" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="harmonic_field"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campo Harmônico (CH)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Dó Maior" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="effective_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tom Efetivo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: C" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bpm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>BPM</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ex: 120" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="melodic_reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referência Melódica</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Tom Jobim" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="video_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link do Vídeo (YouTube)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://youtube.com/watch?v=..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="recording_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da Gravação</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="extra_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione informações extras sobre sua tarefa..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Tarefa"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
