import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface SidebarUserHeaderProps {
  userProfile: {
    name: string;
    avatar_url: string | null;
  } | null;
  userRole: string;
  userPlan: string | null;
  isCollapsed: boolean;
  onClick: () => void;
}

export function SidebarUserHeader({
  userProfile,
  userRole,
  userPlan,
  isCollapsed,
  onClick
}: SidebarUserHeaderProps) {
  const getRoleBadge = () => {
    const badges = {
      admin: { variant: 'default' as const, className: 'bg-destructive text-destructive-foreground', label: 'Admin' },
      teacher: { variant: 'secondary' as const, className: 'bg-primary text-primary-foreground', label: 'Professor' },
      visitor: { variant: 'outline' as const, className: 'border-muted-foreground/50', label: 'Visitante' },
      student: { variant: 'outline' as const, className: 'border-muted-foreground/30', label: 'Aluno' }
    };
    
    return badges[userRole as keyof typeof badges] || badges.student;
  };

  const roleBadge = getRoleBadge();

  return (
    <div 
      className="flex flex-col gap-2 p-3 cursor-pointer hover:bg-muted/50 rounded-md transition-colors" 
      onClick={onClick}
    >
      {isCollapsed ? (
        <Avatar className="h-8 w-8 mx-auto">
          <AvatarImage src={userProfile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10">
            {userProfile?.name?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10">
                {userProfile?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {userProfile?.name || "Usuário"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap ml-1">
            <Badge 
              variant={roleBadge.variant}
              className={roleBadge.className}
            >
              {roleBadge.label}
            </Badge>
            {userPlan && (
              <Badge variant="outline" className="border-primary/50 text-primary">
                {userPlan}
              </Badge>
            )}
          </div>
        </>
      )}
    </div>
  );
}
