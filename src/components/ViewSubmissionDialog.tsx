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

interface ViewSubmissionDialogProps {
  submission: {
    task_name: string;
    video_url: string;
    recording_date: string;
    extra_notes?: string;
    teacher_comments?: string;
    grade?: number;
    status: string;
  };
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Tarefa</DialogTitle>
          <DialogDescription>
            Informações sobre sua tarefa e correção.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          {/* Review Info */}
          {submission.status === "reviewed" && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Correção</h3>
                <Badge className="bg-green-500 hover:bg-green-600">
                  Nota: {submission.grade}/100
                </Badge>
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

              {submission.teacher_comments && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Comentários do Professor</p>
                  <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                    {submission.teacher_comments}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
