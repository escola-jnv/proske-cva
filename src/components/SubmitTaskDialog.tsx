import { useState, useEffect } from "react";
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
import { format } from "date-fns";

const formSchema = z.object({
  video_url: z.string().url("URL inválida").refine(
    (url) => url.includes("youtube.com") || url.includes("youtu.be"),
    "Deve ser um link do YouTube"
  ),
  recording_date: z.string().optional(),
  task_name: z.string().min(3, "Nome da tarefa deve ter pelo menos 3 caracteres"),
  song_name: z.string().optional(),
  harmonic_field: z.string().optional(),
  effective_key: z.string().optional(),
  bpm: z.string().optional(),
  melodic_reference: z.string().optional(),
  extra_notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitTaskDialogProps {
  communityId: string;
}

export const SubmitTaskDialog = ({ communityId }: SubmitTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      video_url: "",
      recording_date: format(new Date(), "yyyy-MM-dd"),
      task_name: "",
      song_name: "",
      harmonic_field: "",
      effective_key: "",
      bpm: "",
      melodic_reference: "",
      extra_notes: "",
    },
  });

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setUserName(profile.name);
        }
      }
    };
    
    if (open) {
      fetchUserName();
    }
  }, [open]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0).toUpperCase())
      .join("");
  };

  const generateTaskCode = () => {
    const values = form.watch();
    const date = values.recording_date;
    const taskName = values.task_name;
    const songName = values.song_name;
    const bpm = values.bpm;
    const melodicRef = values.melodic_reference;
    const harmonicField = values.harmonic_field;
    const effectiveKey = values.effective_key;

    if (!date || !userName) return "";

    const dateFormatted = format(new Date(date), "yyMMdd");
    const initials = getInitials(userName);
    
    let code = `${dateFormatted} - ${initials}`;
    
    if (songName) code += ` - ${songName}`;
    if (bpm) code += ` - ${bpm}bpm`;
    if (melodicRef) code += ` - ${melodicRef}`;
    if (harmonicField) code += ` - CH:${harmonicField}`;
    if (effectiveKey) code += ` - TE:${effectiveKey}`;
    
    return code;
  };

  const taskCode = generateTaskCode();

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("submissions").insert({
        community_id: communityId,
        student_id: user.id,
        video_url: values.video_url,
        recording_date: values.recording_date || format(new Date(), "yyyy-MM-dd"),
        task_name: values.task_name,
        song_name: values.song_name || null,
        harmonic_field: values.harmonic_field || null,
        effective_key: values.effective_key || null,
        bpm: values.bpm ? parseInt(values.bpm) : null,
        melodic_reference: values.melodic_reference || null,
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
        
        {taskCode && (
          <div className="p-4 bg-muted rounded-lg border border-border">
            <p className="text-sm font-medium text-muted-foreground mb-1">Código da Tarefa:</p>
            <p className="text-base font-mono font-semibold text-foreground">{taskCode}</p>
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recording_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Gravação</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="task_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Tarefa *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Monitoria 01" {...field} />
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
                  <FormLabel>Link do YouTube *</FormLabel>
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
                  <FormLabel>Ritmo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Canção, Samba, Bossa Nova" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="harmonic_field"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campo Harmônico (CH)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: G" {...field} />
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
                  <FormLabel>Tom Efetivo (TE)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Ab" {...field} />
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
