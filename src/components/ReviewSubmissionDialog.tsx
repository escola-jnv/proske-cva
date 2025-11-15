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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, Calendar } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  grade_mao_direita: z.number().min(1).max(5),
  grade_mao_esquerda: z.number().min(1).max(5),
  grade_voz: z.number().min(1).max(5),
  grade_video: z.number().min(1).max(5),
  grade_interpretacao: z.number().min(1).max(5),
  grade_audio: z.number().min(1).max(5),
  obs_mao_direita: z.string().min(1, "Observação obrigatória quando nota < 5"),
  obs_mao_esquerda: z.string().min(1, "Observação obrigatória quando nota < 5"),
  obs_voz: z.string().min(1, "Observação obrigatória quando nota < 5"),
  obs_video: z.string().min(1, "Observação obrigatória quando nota < 5"),
  obs_interpretacao: z.string().min(1, "Observação obrigatória quando nota < 5"),
  obs_audio: z.string().min(1, "Observação obrigatória quando nota < 5"),
  teacher_comments: z.string().optional(),
}).refine((data) => {
  const categories = [
    { grade: data.grade_mao_direita, obs: data.obs_mao_direita },
    { grade: data.grade_mao_esquerda, obs: data.obs_mao_esquerda },
    { grade: data.grade_voz, obs: data.obs_voz },
    { grade: data.grade_video, obs: data.obs_video },
    { grade: data.grade_interpretacao, obs: data.obs_interpretacao },
    { grade: data.grade_audio, obs: data.obs_audio },
  ];
  
  for (const cat of categories) {
    if (cat.grade < 5 && (!cat.obs || cat.obs.trim() === "")) {
      return false;
    }
  }
  return true;
}, {
  message: "Observações obrigatórias quando nota < 5",
  path: ["teacher_comments"],
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
    song_name?: string;
    harmonic_field?: string;
    effective_key?: string;
    bpm?: number;
    melodic_reference?: string;
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
      grade_mao_direita: 5,
      grade_mao_esquerda: 5,
      grade_voz: 5,
      grade_video: 5,
      grade_interpretacao: 5,
      grade_audio: 5,
      obs_mao_direita: "Perfeito!",
      obs_mao_esquerda: "Perfeito!",
      obs_voz: "Perfeito!",
      obs_video: "Perfeito!",
      obs_interpretacao: "Perfeito!",
      obs_audio: "Perfeito!",
      teacher_comments: "",
    },
  });

  useEffect(() => {
    const updateTimeAgo = () => {
      const time = formatDistanceToNow(new Date(submission.created_at), {
        addSuffix: true,
        locale: ptBR,
      });
      setTimeAgo(time);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000);

    return () => clearInterval(interval);
  }, [submission.created_at]);

  const calculateFinalGrade = () => {
    const values = form.watch();
    const grades = [
      values.grade_mao_direita,
      values.grade_mao_esquerda,
      values.grade_voz,
      values.grade_video,
      values.grade_interpretacao,
      values.grade_audio,
    ];
    
    const average = grades.reduce((acc, grade) => acc + grade, 0) / grades.length;
    return Math.round((average / 5) * 100);
  };

  const finalGrade = calculateFinalGrade();

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("submissions")
        .update({
          status: "reviewed",
          grade: finalGrade,
          teacher_comments: values.teacher_comments || null,
          grade_mao_direita: values.grade_mao_direita,
          grade_mao_esquerda: values.grade_mao_esquerda,
          grade_voz: values.grade_voz,
          grade_video: values.grade_video,
          grade_interpretacao: values.grade_interpretacao,
          grade_audio: values.grade_audio,
          obs_mao_direita: values.obs_mao_direita,
          obs_mao_esquerda: values.obs_mao_esquerda,
          obs_voz: values.obs_voz,
          obs_video: values.obs_video,
          obs_interpretacao: values.obs_interpretacao,
          obs_audio: values.obs_audio,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submission.id);

      if (error) throw error;

      toast({
        title: "Correção enviada!",
        description: `Nota final: ${finalGrade}/100`,
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

  const GradeCategory = ({ 
    name, 
    fieldName 
  }: { 
    name: string; 
    fieldName: 'grade_mao_direita' | 'grade_mao_esquerda' | 'grade_voz' | 'grade_video' | 'grade_interpretacao' | 'grade_audio'
  }) => {
    const gradeValue = form.watch(fieldName);
    const obsFieldName = fieldName.replace('grade_', 'obs_') as 'obs_mao_direita' | 'obs_mao_esquerda' | 'obs_voz' | 'obs_video' | 'obs_interpretacao' | 'obs_audio';
    
    useEffect(() => {
      if (gradeValue === 5) {
        form.setValue(obsFieldName, "Perfeito!");
      } else if (form.getValues(obsFieldName) === "Perfeito!") {
        form.setValue(obsFieldName, "");
      }
    }, [gradeValue]);

    return (
      <div className="space-y-3 p-4 border rounded-lg bg-card">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">{name}</h4>
          <Badge variant={gradeValue === 5 ? "default" : "secondary"}>
            {gradeValue}/5
          </Badge>
        </div>
        
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                  className="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={obsFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">
                Observação {gradeValue < 5 && <span className="text-destructive">*</span>}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={gradeValue === 5 ? "Perfeito!" : "Descreva o motivo da nota..."}
                  className="min-h-[60px] resize-none"
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Corrigir Tarefa</DialogTitle>
          <DialogDescription>
            Avalie cada categoria de 1 a 5. Observações obrigatórias quando nota menor que 5.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={studentAvatar} />
              <AvatarFallback>{studentName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{studentName}</p>
              <p className="text-sm text-muted-foreground">Aluno</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="mb-1">
                <Clock className="h-3 w-3 mr-1" />
                {timeAgo}
              </Badge>
              <p className="text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 inline mr-1" />
                {new Date(submission.recording_date).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="space-y-3 p-4 border rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Nome da Tarefa</p>
              <p className="font-medium">{submission.task_name}</p>
            </div>
            
            {submission.song_name && (
              <div>
                <p className="text-sm text-muted-foreground">Nome da Música</p>
                <p>{submission.song_name}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {submission.harmonic_field && (
                <div>
                  <p className="text-sm text-muted-foreground">Campo Harmônico</p>
                  <p>{submission.harmonic_field}</p>
                </div>
              )}
              
              {submission.effective_key && (
                <div>
                  <p className="text-sm text-muted-foreground">Tom Efetivo</p>
                  <p>{submission.effective_key}</p>
                </div>
              )}
              
              {submission.melodic_reference && (
                <div>
                  <p className="text-sm text-muted-foreground">Referência Melódica</p>
                  <p>{submission.melodic_reference}</p>
                </div>
              )}
              
              {submission.bpm && (
                <div>
                  <p className="text-sm text-muted-foreground">BPM</p>
                  <p>{submission.bpm}</p>
                </div>
              )}
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
                Assistir no YouTube
              </a>
            </div>
          </div>

          <Separator />

          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Nota Final (Média)</p>
            <p className="text-3xl font-bold">{finalGrade}/100</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <GradeCategory name="Mão Direita" fieldName="grade_mao_direita" />
                <GradeCategory name="Mão Esquerda" fieldName="grade_mao_esquerda" />
                <GradeCategory name="Voz" fieldName="grade_voz" />
                <GradeCategory name="Vídeo" fieldName="grade_video" />
                <GradeCategory name="Interpretação" fieldName="grade_interpretacao" />
                <GradeCategory name="Áudio" fieldName="grade_audio" />
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="teacher_comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentários Gerais (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Comentários adicionais sobre a tarefa..."
                        className="min-h-[100px]"
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 justify-end">
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