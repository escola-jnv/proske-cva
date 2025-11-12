import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, CheckCircle2 } from "lucide-react";

interface SubmissionCardProps {
  taskName: string;
  studentName?: string;
  studentAvatar?: string;
  createdAt: string;
  status: "pending" | "reviewed";
  grade?: number;
  onClick: () => void;
}

export const SubmissionCard = ({
  taskName,
  studentName,
  studentAvatar,
  createdAt,
  status,
  grade,
  onClick,
}: SubmissionCardProps) => {
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
              {studentName && (
                <p className="text-sm text-muted-foreground">{studentName}</p>
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
          <p className="text-xs text-muted-foreground mt-1">
            Enviado em {new Date(createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
    </Card>
  );
};
