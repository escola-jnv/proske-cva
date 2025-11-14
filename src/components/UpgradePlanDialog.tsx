import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";

interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planNames: string[];
  groupName: string;
}

export function UpgradePlanDialog({
  open,
  onOpenChange,
  planNames,
  groupName,
}: UpgradePlanDialogProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/plans");
  };

  const planText = planNames.length > 1 
    ? `um dos seguintes planos: ${planNames.join(', ')}`
    : `o plano ${planNames[0]}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Crown className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">
            Acesso Restrito
          </DialogTitle>
          <DialogDescription className="text-center">
            Para acessar o grupo <span className="font-semibold text-foreground">"{groupName}"</span>, 
            você precisa adquirir <span className="font-semibold text-primary">{planText}</span>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpgrade}>
            Ver Planos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
