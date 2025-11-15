import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SubmissionCardProps {
  taskId: string;
  taskName: string;
  studentName?: string;
  studentAvatar?: string;
  createdAt: string;
  status: "pending" | "reviewed";
  grade?: number;
  onClick: () => void;
}

export const SubmissionCard = ({
  taskId,
  taskName,
  studentName,
  studentAvatar,
  createdAt,
  status,
  grade,
  onClick,
}: SubmissionCardProps) => {
  const pendingTime = status === "pending" 
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ptBR })
    : null;
  return (
    <Card
      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {studentName && (
          <Avatar>
            <AvatarImage src={studentAvatar} />
            <AvatarFallback>{studentName[0]}</AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{taskName}</h3>
              <p className="text-xs text-muted-foreground font-mono">#{taskId.slice(0, 8)}</p>
              {studentName && (
                <p className="text-sm text-muted-foreground mt-1">{studentName}</p>
              )}
            </div>
            {status === "pending" ? (
              <Badge variant="secondary" className="gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                Pendente
              </Badge>
            ) : (
              <Badge className="gap-1 shrink-0 bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Nota: {grade}/100
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>Enviado em {new Date(createdAt).toLocaleDateString("pt-BR")}</span>
            {pendingTime && (
              <>
                <span>•</span>
                <span className="text-orange-500 font-medium">{pendingTime}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
