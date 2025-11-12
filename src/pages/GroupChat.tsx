import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send } from "lucide-react";
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
  profiles: {
    name: string;
    avatar_url: string | null;
  };
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  community_id: string;
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
    const channel = supabase
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
            .select("name, avatar_url")
            .eq("id", payload.new.user_id)
            .single();

          const newMsg = {
            ...payload.new,
            profiles: profileData || { name: "Usuário", avatar_url: null },
          } as Message;

          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchGroupData = async (grpId: string, userId: string) => {
    try {
      // Fetch group
      const { data: groupData, error: groupError } = await supabase
        .from("conversation_groups")
        .select("*")
        .eq("id", grpId)
        .single();

      if (groupError) throw groupError;

      setGroup(groupData);

      // Fetch messages
      await fetchMessages(grpId);
    } catch (error: any) {
      console.error("Error fetching group:", error);
      toast.error("Erro ao carregar grupo");
      navigate("/communities");
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
        .select("id, name, avatar_url")
        .in("id", userIds);

      // Map profiles to messages
      const messagesWithProfiles = messagesData?.map((msg) => ({
        ...msg,
        profiles: profilesData?.find((p) => p.id === msg.user_id) || {
          name: "Usuário",
          avatar_url: null,
        },
      }));

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/communities/${group?.community_id}/manage`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {group?.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="font-semibold">{group?.name}</h1>
            {group?.description && (
              <p className="text-xs text-muted-foreground">{group.description}</p>
            )}
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
                    <Avatar className="h-10 w-10">
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
                      {isOwn ? "Você" : message.profiles?.name || "Usuário"}
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
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
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
        <form
          onSubmit={handleSendMessage}
          className="container mx-auto max-w-4xl flex gap-2"
        >
          <Input
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
      </div>
    </div>
  );
};

export default GroupChat;
