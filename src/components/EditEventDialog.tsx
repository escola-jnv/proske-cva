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
});

type Group = {
  id: string;
  name: string;
  description: string | null;
};

type EditEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  communityId: string;
  userId: string;
  onSuccess?: () => void;
};

export const EditEventDialog = ({
  open,
  onOpenChange,
  eventId,
  communityId,
  userId,
  onSuccess,
}: EditEventDialogProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    group_ids: [] as string[],
  });

  useEffect(() => {
    if (open) {
      fetchEventData();
      fetchGroups();
    }
  }, [open, eventId, communityId, userId]);

  const fetchEventData = async () => {
    try {
      // Fetch event details
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;

      // Fetch associated groups
      const { data: eventGroups, error: groupsError } = await supabase
        .from("event_groups")
        .select("group_id")
        .eq("event_id", eventId);

      if (groupsError) throw groupsError;

      const eventDate = new Date(event.event_date);
      setForm({
        title: event.title,
        description: event.description || "",
        event_date: format(eventDate, "yyyy-MM-dd"),
        event_time: format(eventDate, "HH:mm"),
        group_ids: eventGroups.map((eg) => eg.group_id),
      });
    } catch (error: any) {
      console.error("Error fetching event:", error);
      toast.error("Erro ao carregar evento");
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
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

      const { data, error } = await supabase
        .from("conversation_groups")
        .select("id, name, description")
        .eq("community_id", communityId)
        .in("id", groupIds);

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      toast.error("Erro ao carregar grupos");
    } finally {
      setLoading(false);
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
      setSaving(true);

      const eventDateTime = new Date(`${validated.event_date}T${validated.event_time}`).toISOString();

      // Update event
      const { error: eventError } = await supabase
        .from("events")
        .update({
          title: validated.title,
          description: validated.description || null,
          event_date: eventDateTime,
        })
        .eq("id", eventId);

      if (eventError) throw eventError;

      // Delete old group associations
      const { error: deleteError } = await supabase
        .from("event_groups")
        .delete()
        .eq("event_id", eventId);

      if (deleteError) throw deleteError;

      // Create new group associations
      const eventGroups = validated.group_ids.map((groupId) => ({
        event_id: eventId,
        group_id: groupId,
      }));

      const { error: egError } = await supabase
        .from("event_groups")
        .insert(eventGroups);

      if (egError) throw egError;

      // Delete old participants
      const { error: deleteParticipantsError } = await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", eventId);

      if (deleteParticipantsError) throw deleteParticipantsError;

      // Get all members from selected groups
      const { data: members, error: membersError } = await supabase
        .from("group_members")
        .select("user_id")
        .in("group_id", validated.group_ids);

      if (membersError) throw membersError;

      // Create new participants
      const uniqueUserIds = [...new Set(members.map((m) => m.user_id))];
      const participants = uniqueUserIds.map((uid) => ({
        event_id: eventId,
        user_id: uid,
        status: "pending",
        google_calendar_invited: false,
      }));

      const { error: participantsError } = await supabase
        .from("event_participants")
        .insert(participants);

      if (participantsError) throw participantsError;

      toast.success("Evento atualizado com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Erro de validação");
      } else {
        toast.error("Erro ao atualizar evento: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
          <DialogDescription>
            Atualize as informações do evento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || groups.length === 0}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
