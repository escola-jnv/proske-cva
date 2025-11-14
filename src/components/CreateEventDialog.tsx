import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";

const eventSchema = z.object({
  title: z.string().trim().min(3, "Título deve ter pelo menos 3 caracteres").max(100),
  description: z.string().trim().max(500, "Descrição muito longa").optional(),
  event_date: z.string().min(1, "Selecione uma data"),
  event_time: z.string().min(1, "Selecione uma hora"),
  group_ids: z.array(z.string()).min(1, "Selecione pelo menos um grupo"),
  event_type: z.enum(['interview', 'mentoring', 'group_study', 'live'], {
    required_error: "Selecione um tipo de evento"
  }),
  social_media_link: z.string().url("Link inválido").optional().or(z.literal("")),
});

type Group = {
  id: string;
  name: string;
  description: string | null;
};

type CreateEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  userId: string;
  onSuccess?: () => void;
  isAdmin?: boolean;
  initialEventType?: "interview" | "mentoring" | "group_study" | "live";
};

export const CreateEventDialog = ({
  open,
  onOpenChange,
  communityId,
  userId,
  onSuccess,
  isAdmin = false,
  initialEventType = "group_study",
}: CreateEventDialogProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    group_ids: [] as string[],
    event_type: initialEventType,
    social_media_link: "",
    created_by: userId,
  });

  useEffect(() => {
    if (open) {
      fetchGroups();
      if (isAdmin) {
        fetchUsers();
      }
      // Update event_type when dialog opens with new initialEventType
      setForm(prev => ({ ...prev, event_type: initialEventType }));
    }
  }, [open, communityId, userId, isAdmin, initialEventType]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        // Admin can see all groups in the community
        const { data, error } = await supabase
          .from("conversation_groups")
          .select("id, name, description")
          .eq("community_id", communityId);

        if (error) throw error;
        setGroups(data || []);
      } else {
        // First, get group IDs where user is a member
        const { data: memberData, error: memberError } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", userId);

        if (memberError) throw memberError;

        const groupIds = memberData.map((m) => m.group_id);

        if (groupIds.length === 0) {
          setGroups([]);
          setLoading(false);
          return;
        }

        // Then fetch those groups that belong to this community
        const { data, error } = await supabase
          .from("conversation_groups")
          .select("id, name, description")
          .eq("community_id", communityId)
          .in("id", groupIds);

        if (error) throw error;
        setGroups(data || []);
      }
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      toast.error("Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .order("name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    }
  };

  const toggleGroup = (groupId: string) => {
    setForm((prev) => ({
      ...prev,
      group_ids: prev.group_ids.includes(groupId)
        ? prev.group_ids.filter((id) => id !== groupId)
        : [...prev.group_ids, groupId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = eventSchema.parse(form);
      setCreating(true);

      // Combine date and time into ISO datetime
      const eventDateTime = new Date(`${validated.event_date}T${validated.event_time}`).toISOString();

      // Create event
      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({
          title: validated.title,
          description: validated.description || null,
          event_date: eventDateTime,
          duration_minutes: 60, // Fixed duration
          created_by: form.created_by,
          community_id: communityId,
          event_type: validated.event_type,
          social_media_link: validated.social_media_link || null,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create event-group relationships
      const eventGroups = validated.group_ids.map((groupId) => ({
        event_id: event.id,
        group_id: groupId,
      }));

      const { error: egError } = await supabase
        .from("event_groups")
        .insert(eventGroups);

      if (egError) throw egError;

      // Get all members from selected groups
      const { data: members, error: membersError } = await supabase
        .from("group_members")
        .select("user_id")
        .in("group_id", validated.group_ids);

      if (membersError) throw membersError;

      // Get unique user IDs (remove duplicates from multiple groups)
      const uniqueUserIds = [...new Set(members.map((m) => m.user_id))];
      
      // Create participants (upsert to avoid duplicates)
      const participants = uniqueUserIds.map((uid) => ({
        event_id: event.id,
        user_id: uid,
        status: "pending",
        google_calendar_invited: false,
      }));

      const { error: participantsError } = await supabase
        .from("event_participants")
        .upsert(participants, {
          onConflict: "event_id,user_id",
          ignoreDuplicates: false,
        });

      if (participantsError) throw participantsError;

      toast.success("Evento criado com sucesso!");
      setForm({
        title: "",
        description: "",
        event_date: "",
        event_time: "",
        group_ids: [],
        event_type: "group_study",
        social_media_link: "",
        created_by: userId,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Erro de validação");
      } else {
        toast.error("Erro ao criar evento: " + error.message);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Novo Evento</DialogTitle>
          <DialogDescription>
            Crie um evento e compartilhe com os grupos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="created_by">Responsável pelo Evento *</Label>
              <Select
                value={form.created_by}
                onValueChange={(value) => setForm({ ...form, created_by: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} {user.email && `(${user.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Aula de Matemática"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detalhes sobre o evento"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_type">Tipo de Evento *</Label>
            <Select
              value={form.event_type}
              onValueChange={(value: any) => setForm({ ...form, event_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interview">Entrevista (Onboarding)</SelectItem>
                <SelectItem value="mentoring">Monitoria (Aluno x Professor)</SelectItem>
                <SelectItem value="group_study">Estudo em Grupo</SelectItem>
                <SelectItem value="live">Live (Redes Sociais)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.event_type === 'live' && (
            <div className="space-y-2">
              <Label htmlFor="social_media_link">Link da Rede Social</Label>
              <Input
                id="social_media_link"
                type="url"
                value={form.social_media_link}
                onChange={(e) => setForm({ ...form, social_media_link: e.target.value })}
                placeholder="https://instagram.com/... ou youtube.com/..."
              />
              <p className="text-xs text-muted-foreground">
                Insira o link do Instagram, TikTok ou YouTube onde a live será realizada
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_date">Data *</Label>
              <Input
                id="event_date"
                type="date"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                min={format(new Date(), "yyyy-MM-dd")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_time">Hora *</Label>
              <Input
                id="event_time"
                type="time"
                value={form.event_time}
                onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Grupos * (duração: 60 minutos)</Label>
            <ScrollArea className="h-48 border rounded-md p-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando grupos...</p>
              ) : groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Você não é membro de nenhum grupo desta comunidade
                </p>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-start gap-3">
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={form.group_ids.includes(group.id)}
                        onCheckedChange={() => toggleGroup(group.id)}
                      />
                      <label
                        htmlFor={`group-${group.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        <div className="font-medium">{group.name}</div>
                        {group.description && (
                          <div className="text-muted-foreground text-xs">
                            {group.description}
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={creating || groups.length === 0}>
              {creating ? "Criando..." : "Criar Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
