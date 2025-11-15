import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type AssignedTaskCardProps = {
  title: string;
  description: string;
  deadline?: string | null;
  createdAt: string;
  status: "pending" | "completed";
  onClick: () => void;
};

export function AssignedTaskCard({
  title,
  description,
  deadline,
  createdAt,
  status,
  onClick,
}: AssignedTaskCardProps) {
  const isOverdue = deadline && new Date(deadline) < new Date() && status === "pending";

  return (
    <Card
      className="p-4 hover:bg-accent cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold">{title}</h3>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                Criada {formatDistanceToNow(new Date(createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>

            {deadline && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  Prazo: {formatDistanceToNow(new Date(deadline), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {status === "pending" ? (
            <Badge variant={isOverdue ? "destructive" : "secondary"}>
              {isOverdue ? "Atrasada" : "Pendente"}
            </Badge>
          ) : (
            <Badge variant="default">Concluída</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
