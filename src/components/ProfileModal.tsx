import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, User } from "lucide-react";

type ProfileModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    name: string;
    avatar_url: string | null;
    city: string | null;
  } | null;
};

export function ProfileModal({ open, onOpenChange, profile }: ProfileModalProps) {
  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="text-center">Perfil do Aluno</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          <Avatar className="h-32 w-32 border-4 border-primary/10">
            <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="text-4xl bg-primary/10">
              {profile.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          
          <div className="w-full space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <User className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Nome</p>
                <p className="font-medium truncate">{profile.name || "Não informado"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Cidade</p>
                <p className="font-medium truncate">{profile.city || "Não informado"}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
