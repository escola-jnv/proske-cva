import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ExternalLink, FileText, Video } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type AssignedTask = {
  id: string;
  title: string;
  description: string;
  youtube_url?: string | null;
  pdf_url?: string | null;
  deadline?: string | null;
  created_at: string;
  status: "pending" | "completed";
};

type ViewAssignedTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: AssignedTask | null;
  onSubmit?: () => void;
};

export function ViewAssignedTaskDialog({
  open,
  onOpenChange,
  task,
  onSubmit,
}: ViewAssignedTaskDialogProps) {
  if (!task) return null;

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status === "pending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Badge variant={task.status === "pending" ? (isOverdue ? "destructive" : "secondary") : "default"}>
              {task.status === "pending" ? (isOverdue ? "Atrasada" : "Pendente") : "Concluída"}
            </Badge>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Descrição do Exercício</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {task.description}
            </p>
          </div>

          {task.youtube_url && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Video className="w-4 h-4" />
                Vídeo de Referência
              </h3>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(task.youtube_url!, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir no YouTube
              </Button>
            </div>
          )}

          {task.pdf_url && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Material de Apoio (PDF)
              </h3>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(task.pdf_url!, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir PDF
              </Button>
            </div>
          )}

          {task.deadline && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Prazo Limite
              </h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(task.deadline), "PPP 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          )}

          {task.status === "pending" && onSubmit && (
            <Button onClick={onSubmit} className="w-full">
              Enviar Tarefa
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
