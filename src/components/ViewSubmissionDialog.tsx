import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ViewSubmissionDialogProps {
  submission: {
    task_name: string;
    video_url: string;
    recording_date: string;
    extra_notes?: string;
    teacher_comments?: string;
    grade?: number;
    status: string;
    song_name?: string;
    harmonic_field?: string;
    effective_key?: string;
    bpm?: number;
    melodic_reference?: string;
    grade_mao_direita?: number;
    grade_mao_esquerda?: number;
    grade_voz?: number;
    grade_video?: number;
    grade_interpretacao?: number;
    grade_audio?: number;
    obs_mao_direita?: string;
    obs_mao_esquerda?: string;
    obs_voz?: string;
    obs_video?: string;
    obs_interpretacao?: string;
    obs_audio?: string;
    task_code?: string | null;
  };
  studentName?: string;
  teacherName?: string;
  teacherAvatar?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ViewSubmissionDialog = ({
  submission,
  teacherName,
  teacherAvatar,
  open,
  onOpenChange,
}: ViewSubmissionDialogProps) => {
  const CategoryGrade = ({ 
    name, 
    grade, 
    observation 
  }: { 
    name: string; 
    grade?: number; 
    observation?: string;
  }) => {
    if (!grade) return null;
    
    return (
      <div className="p-3 border rounded-lg bg-card">
        <div className="flex items-center justify-between mb-2">
          <p className="font-medium text-sm">{name}</p>
          <Badge variant={grade === 5 ? "default" : "secondary"}>
            {grade}/5
          </Badge>
        </div>
        {observation && (
          <p className="text-sm text-muted-foreground">{observation}</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Tarefa</DialogTitle>
          <DialogDescription>
            <span>Informações sobre sua tarefa e correção</span>
            {submission.task_code && (
              <span className="ml-2 text-xs font-mono text-muted-foreground">
                • {submission.task_code}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Nome da Tarefa</p>
              <p className="font-medium">{submission.task_name}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Data da Gravação</p>
              <p>{new Date(submission.recording_date).toLocaleDateString("pt-BR")}</p>
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
                <p className="text-sm text-muted-foreground">Suas Observações</p>
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

          {submission.status === "reviewed" && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Correção</h3>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Nota Final</p>
                    <Badge className="bg-green-500 hover:bg-green-600 text-lg px-4 py-1">
                      {submission.grade}/100
                    </Badge>
                  </div>
                </div>
                
                {teacherName && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={teacherAvatar} />
                      <AvatarFallback>{teacherName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{teacherName}</p>
                      <p className="text-xs text-muted-foreground">Professor</p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-3">Avaliação por Categoria</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <CategoryGrade 
                      name="Mão Direita" 
                      grade={submission.grade_mao_direita} 
                      observation={submission.obs_mao_direita}
                    />
                    <CategoryGrade 
                      name="Mão Esquerda" 
                      grade={submission.grade_mao_esquerda} 
                      observation={submission.obs_mao_esquerda}
                    />
                    <CategoryGrade 
                      name="Voz" 
                      grade={submission.grade_voz} 
                      observation={submission.obs_voz}
                    />
                    <CategoryGrade 
                      name="Vídeo" 
                      grade={submission.grade_video} 
                      observation={submission.obs_video}
                    />
                    <CategoryGrade 
                      name="Interpretação" 
                      grade={submission.grade_interpretacao} 
                      observation={submission.obs_interpretacao}
                    />
                    <CategoryGrade 
                      name="Áudio" 
                      grade={submission.grade_audio} 
                      observation={submission.obs_audio}
                    />
                  </div>
                </div>

                {submission.teacher_comments && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Comentários Gerais</p>
                    <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                      {submission.teacher_comments}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};