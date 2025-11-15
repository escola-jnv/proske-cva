import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileModal } from "@/components/ProfileModal";
import { GroupInfoModal } from "@/components/GroupInfoModal";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useIsMobile } from "@/hooks/use-mobile";
import { Send } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().trim().min(1, "Mensagem não pode estar vazia").max(1000),
});

type Message = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  message_type?: string;
  metadata?: {
    type?: 'task_submission' | 'task_reviewed' | 'task_assigned';
    submission_id?: string;
    video_url?: string;
    task_name?: string;
    task_code?: string;
    grade?: number;
    student_name?: string;
    assigned_task_id?: string;
    task_title?: string;
    students?: Array<{
      id: string;
      name: string;
      avatar_url?: string;
    }>;
  };
  profiles: {
    name: string;
    avatar_url: string | null;
    city: string | null;
  };
  user_role?: string;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  community_id: string;
  allowed_message_roles: string[];
};

const GroupChat = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedProfile, setSelectedProfile] = useState<{
    name: string;
    avatar_url: string | null;
    city: string | null;
  } | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [groupInfoModalOpen, setGroupInfoModalOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Array<{id: string, name: string, avatar_url: string | null}>>([]);
  const [userRole, setUserRole] = useState<string>('visitor');
  const [canSendMessages, setCanSendMessages] = useState(true);
  const isMobile = useIsMobile();

  // Track user activity
  useActivityTracker(user?.id);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);

      if (!session?.user) {
        navigate("/auth");
      } else if (groupId) {
        fetchGroupData(groupId, session.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, groupId]);

  useEffect(() => {
    if (!groupId) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          console.log("New message:", payload);
          
          // Fetch the profile data for the new message
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name, avatar_url, city")
            .eq("id", payload.new.user_id)
            .single();

          // Fetch the role data for the new message
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", payload.new.user_id)
            .single();

          const newMsg = {
            ...payload.new,
            profiles: profileData || { name: "Usuário", avatar_url: null, city: null },
            user_role: roleData?.role || "student",
          } as Message;

          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    // Refresh online users every 30 seconds
    const onlineInterval = setInterval(() => {
      if (groupId) fetchOnlineUsers(groupId);
    }, 30000);

    return () => {
      supabase.removeChannel(messagesChannel);
      clearInterval(onlineInterval);
    };
  }, [groupId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when entering the group
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!user?.id || !groupId || messages.length === 0) return;

      try {
        // Get all message IDs from this group that are not from the current user
        const messageIds = messages
          .filter(msg => msg.user_id !== user.id)
          .map(msg => msg.id);

        if (messageIds.length === 0) return;

        // Insert read status for all messages (using ON CONFLICT DO NOTHING to avoid duplicates)
        const readStatusInserts = messageIds.map(messageId => ({
          user_id: user.id,
          message_id: messageId,
          group_id: groupId,
        }));

        await supabase
          .from('message_read_status')
          .upsert(readStatusInserts, { 
            onConflict: 'user_id,message_id',
            ignoreDuplicates: true 
          });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    markMessagesAsRead();
  }, [user?.id, groupId, messages]);

  const fetchGroupData = async (grpId: string, userId: string) => {
    try {
      // Fetch group
      const { data: groupData, error: groupError } = await supabase
        .from("conversation_groups")
        .select("id, name, description, community_id, allowed_message_roles")
        .eq("id", grpId)
        .single();

      if (groupError) throw groupError;
      
      // Type assertion since types haven't been regenerated yet
      setGroup(groupData as unknown as Group);

      // Fetch user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      const currentUserRole = roleData?.role || 'visitor';
      setUserRole(currentUserRole);

      // Check if user can send messages
      const allowedRoles = (groupData as any).allowed_message_roles || [];
      const canSend = allowedRoles.includes(currentUserRole);
      setCanSendMessages(canSend);

      fetchMessages(grpId);
      fetchOnlineUsers(grpId);
    } catch (error: any) {
      console.error("Error fetching group:", error);
      toast.error("Erro ao carregar grupo");
    }
  };

  const fetchOnlineUsers = async (grpId: string) => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Get plan requirements for this group
      const { data: planLinks } = await supabase
        .from("plan_default_groups")
        .select(`
          plan_id,
          subscription_plans (
            id,
            name
          )
        `)
        .eq("group_id", grpId);

      // If group has no plan requirements, show all active users
      if (!planLinks || planLinks.length === 0) {
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, name, avatar_url, last_active_at")
          .gte("last_active_at", twentyFourHoursAgo);
        
        const online = allProfiles?.map((profile: any) => ({
          id: profile.id,
          name: profile.name,
          avatar_url: profile.avatar_url,
        })) || [];
        
        setOnlineUsers(online);
        return;
      }

      // Get all users who have subscriptions to plans that give access to this group
      const planIds = planLinks.map(link => link.plan_id);
      
      const { data: subscriptionsData } = await supabase
        .from("user_subscriptions")
        .select("user_id")
        .in("plan_id", planIds)
        .eq("status", "active");

      if (!subscriptionsData || subscriptionsData.length === 0) {
        setOnlineUsers([]);
        return;
      }

      const userIds = subscriptionsData.map(s => s.user_id);

      // Fetch profiles for users with active subscriptions
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, last_active_at")
        .in("id", userIds)
        .gte("last_active_at", twentyFourHoursAgo);

      if (profilesError) throw profilesError;

      const online = profilesData?.map((profile: any) => ({
        id: profile.id,
        name: profile.name,
        avatar_url: profile.avatar_url,
      })) || [];

      setOnlineUsers(online);
    } catch (error: any) {
      console.error("Error fetching online users:", error);
    }
  };

  const fetchMessages = async (grpId: string) => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("group_id", grpId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(messagesData?.map((m) => m.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, city")
        .in("id", userIds);

      // Fetch roles for all unique user_ids
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      // Map profiles and roles to messages
      const messagesWithProfiles = messagesData?.map((msg) => {
        const userRole = rolesData?.find((r) => r.user_id === msg.user_id)?.role;
        
        return {
          ...msg,
          profiles: profilesData?.find((p) => p.id === msg.user_id) || {
            name: "Usuário",
            avatar_url: null,
            city: null,
          },
          user_role: userRole || "student",
          message_type: msg.message_type || 'normal',
          metadata: msg.metadata || {},
        };
      });

      setMessages(messagesWithProfiles as Message[]);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = messageSchema.parse({ content: newMessage });
      setSending(true);

      const { error } = await supabase.from("messages").insert({
        content: validated.content,
        user_id: user?.id,
        group_id: groupId,
        community_id: group?.community_id,
      });

      if (error) throw error;

      setNewMessage("");
      inputRef.current?.focus();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Erro de validação");
      } else {
        toast.error("Erro ao enviar mensagem: " + error.message);
      }
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAvatarClick = (profile: { name: string; avatar_url: string | null; city: string | null }) => {
    setSelectedProfile(profile);
    setProfileModalOpen(true);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast.success("Logout realizado com sucesso");
    } catch (error: any) {
      toast.error("Erro ao fazer logout: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Avatar
            className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            onClick={() => setGroupInfoModalOpen(true)}
          >
            <AvatarFallback className="bg-primary text-primary-foreground">
              {group?.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 cursor-pointer" onClick={() => setGroupInfoModalOpen(true)}>
            <h1 className="font-semibold">{group?.name}</h1>
            {group?.description && (
              <p className="text-xs text-muted-foreground">{group.description}</p>
            )}
            
            {/* Online users indicator */}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 5).map((user) => (
                  <Avatar key={user.id} className="h-5 w-5 border-2 border-card">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {onlineUsers.length} online
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-6" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-1">
          {messages.map((message, index) => {
            const isOwn = message.user_id === user?.id;
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const isFirstInGroup = !prevMessage || prevMessage.user_id !== message.user_id;
            const isTeacher = message.user_role === "teacher";
            const isAdmin = message.user_role === "admin";
            const isSpecialRole = isTeacher || isAdmin;
            
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"} ${
                  isFirstInGroup ? "mt-4" : "mt-0.5"
                }`}
              >
                {/* Avatar - only show for first message in group */}
                <div className="w-10 flex-shrink-0">
                  {isFirstInGroup && (
                    <Avatar 
                      className={`h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all ${
                        isAdmin 
                          ? "ring-2 ring-destructive ring-offset-2 ring-offset-background" 
                          : isTeacher 
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                          : ""
                      }`}
                      onClick={() => handleAvatarClick(message.profiles)}
                    >
                      <AvatarImage src={message.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-sm bg-primary/10">
                        {message.profiles?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                
                <div
                  className={`flex flex-col max-w-[70%] ${
                    isOwn ? "items-end" : "items-start"
                  }`}
                >
                  {/* Name - only show for first message in group */}
                  {isFirstInGroup && (
                    <span className="text-xs font-medium mb-1 px-1" style={{ color: isOwn ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}>
                      {isOwn 
                        ? "Você" 
                        : isAdmin 
                        ? `${message.profiles?.name || "Usuário"} (admin)`
                        : isTeacher
                        ? `Professor ${message.profiles?.name || "Usuário"}`
                        : message.profiles?.name || "Usuário"
                      }
                    </span>
                  )}
                  
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    } ${
                      isFirstInGroup
                        ? isOwn ? "rounded-tr-sm" : "rounded-tl-sm"
                        : ""
                    } ${
                      isSpecialRole ? "shadow-lg" : ""
                    }`}
                  >
                    <p className={`whitespace-pre-wrap break-words ${
                      isAdmin ? "text-[15px] font-bold" : "text-sm"
                    }`}>
                      {message.content}
                    </p>
                    
                    {/* Task-specific buttons based on metadata */}
                    {message.metadata?.type === 'task_submission' && message.metadata.video_url && (
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => window.open(message.metadata?.video_url, '_blank')}
                        >
                          📹 Assistir Vídeo
                        </Button>
                      </div>
                    )}
                    
                    {message.metadata?.type === 'task_assigned' && message.metadata.students && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.metadata.students.map((student) => (
                          <Avatar key={student.id} className="h-6 w-6 border-2 border-background">
                            <AvatarImage src={student.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {student.name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    )}
                    
                    <span
                      className={`text-xs mt-1 block ${
                        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4">
        {!canSendMessages ? (
          <div className="container mx-auto max-w-4xl text-center py-2">
            <p className="text-sm text-muted-foreground">
              Você não tem permissão para enviar mensagens neste grupo
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSendMessage}
            className="container mx-auto max-w-4xl flex gap-2"
          >
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="flex-1"
              disabled={sending}
            />
            <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
              <Send className="h-5 w-5" />
            </Button>
          </form>
        )}
      </div>

      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        profile={selectedProfile}
      />

      <GroupInfoModal
        open={groupInfoModalOpen}
        onOpenChange={setGroupInfoModalOpen}
        group={group}
      />
    </div>
  );
};

export default GroupChat;
