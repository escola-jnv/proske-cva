import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, Calendar } from "lucide-react";

const formSchema = z.object({
  teacher_comments: z.string().min(10, "Comentários devem ter pelo menos 10 caracteres"),
  grade: z.number().min(0).max(100),
});

type FormValues = z.infer<typeof formSchema>;

interface ReviewSubmissionDialogProps {
  submission: {
    id: string;
    task_name: string;
    video_url: string;
    recording_date: string;
    extra_notes?: string;
    student_id: string;
    community_id: string;
    created_at: string;
  };
  studentName: string;
  studentAvatar?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewComplete: () => void;
}

export const ReviewSubmissionDialog = ({
  submission,
  studentName,
  studentAvatar,
  open,
  onOpenChange,
  onReviewComplete,
}: ReviewSubmissionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [timeAgo, setTimeAgo] = useState("");
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teacher_comments: "",
      grade: 50,
    },
  });

  // Update time ago every minute
  useEffect(() => {
    const updateTimeAgo = () => {
      const time = formatDistanceToNow(new Date(submission.created_at), {
        addSuffix: true,
        locale: ptBR,
      });
      setTimeAgo(time);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [submission.created_at]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("submissions")
        .update({
          status: "reviewed",
          teacher_comments: values.teacher_comments,
          grade: values.grade,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submission.id);

      if (error) throw error;

      toast({
        title: "Correção enviada!",
        description: "O aluno será notificado sobre a correção.",
      });

      form.reset();
      onOpenChange(false);
      onReviewComplete();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar correção",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const gradeValue = form.watch("grade");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Corrigir Tarefa</DialogTitle>
          <DialogDescription>
            Revise o vídeo e forneça feedback ao aluno.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Avatar>
              <AvatarImage src={studentAvatar} />
              <AvatarFallback>{studentName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{studentName}</p>
              <p className="text-sm text-muted-foreground">Aluno</p>
            </div>
          </div>

          {/* Submission Time Info */}
          <div className="flex flex-wrap gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-1.5 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">
                Enviado em: {new Date(submission.created_at).toLocaleDateString("pt-BR")} às{" "}
                {new Date(submission.created_at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 text-destructive" />
              <span className="font-semibold text-destructive">
                Aguardando {timeAgo.replace("há ", "")}
              </span>
            </div>
          </div>

          {/* Task Info */}
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Nome da Tarefa</p>
              <p className="font-medium">{submission.task_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data da Gravação</p>
              <p>{new Date(submission.recording_date).toLocaleDateString("pt-BR")}</p>
            </div>
            {submission.extra_notes && (
              <div>
                <p className="text-sm text-muted-foreground">Observações do Aluno</p>
                <p className="text-sm bg-muted p-3 rounded">{submission.extra_notes}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Link do Vídeo</p>
              <a
                href={submission.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir no YouTube
              </a>
            </div>
          </div>

          {/* Review Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nota: {gradeValue}/100</FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teacher_comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentários da Correção</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Forneça feedback detalhado sobre o desempenho do aluno..."
                        className="min-h-[120px] resize-none"
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
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar Correção"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
