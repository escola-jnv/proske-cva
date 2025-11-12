import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Member = {
  id: string;
  user_id: string;
  profiles: {
    name: string;
    avatar_url: string | null;
    last_active_at: string | null;
  };
};

type GroupInfoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: {
    id: string;
    name: string;
    description: string | null;
  } | null;
};

export function GroupInfoModal({ open, onOpenChange, group }: GroupInfoModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && group) {
      fetchMembers();
    }
  }, [open, group]);

  const fetchMembers = async () => {
    if (!group) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select(`
          id,
          user_id
        `)
        .eq("group_id", group.id)
        .order("joined_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = data?.map(m => m.user_id) || [];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name, avatar_url, last_active_at")
          .in("id", userIds);

        const membersWithProfiles = data?.map(m => ({
          ...m,
          profiles: profilesData?.find(p => p.id === m.user_id) || {
            name: "Usuário",
            avatar_url: null,
            last_active_at: null,
          },
        }));

        setMembers(membersWithProfiles || []);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const isUserOnline = (lastActiveAt: string | null): boolean => {
    if (!lastActiveAt) return false;
    
    const now = new Date();
    const lastActive = new Date(lastActiveAt);
    const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60);
    
    return diffMinutes <= 90;
  };

  if (!group) return null;

  const onlineCount = members.filter(m => isUserOnline(m.profiles.last_active_at)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle>Informações do Grupo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Group Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-4 border-primary/10">
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {group.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{group.name}</h3>
              {group.description && (
                <p className="text-sm text-muted-foreground">{group.description}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-xs text-muted-foreground">Membros</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Circle className="h-5 w-5 text-green-500 fill-green-500" />
              <div>
                <p className="text-2xl font-bold">{onlineCount}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Membros</h4>
            <ScrollArea className="h-[240px] pr-4">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
              ) : members.length > 0 ? (
                <div className="space-y-2">
                  {members.map((member) => {
                    const isOnline = isUserOnline(member.profiles.last_active_at);
                    const profile = member.profiles;
                    
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-sm bg-primary/10">
                              {profile?.name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {profile?.name || "Usuário"}
                          </p>
                        </div>
                        {isOnline && (
                          <Badge variant="secondary" className="text-xs">
                            Online
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum membro encontrado
                </p>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
