import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MapPin, Plus, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { formatName } from "@/lib/formatName";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ManageItemTagsDialog } from "./ManageItemTagsDialog";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface CRMDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  isLead: boolean;
  tags: Tag[];
  onRefetch: () => void;
}

export function CRMDetailsDialog({
  open,
  onOpenChange,
  item,
  isLead,
  tags,
  onRefetch,
}: CRMDetailsDialogProps) {
  const [newNote, setNewNote] = useState("");
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);

  const { data: notes, refetch: refetchNotes } = useQuery({
    queryKey: ["crm-notes", item.id, isLead],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_notes")
        .select(`
          *,
          profiles!crm_notes_created_by_fkey (name, avatar_url)
        `)
        .eq(isLead ? "lead_id" : "user_id", item.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase.from("crm_notes").insert({
        [isLead ? "lead_id" : "user_id"]: item.id,
        note,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewNote("");
      refetchNotes();
      toast.success("Observação adicionada!");
    },
    onError: () => {
      toast.error("Erro ao adicionar observação");
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const itemTags = isLead
    ? item.lead_tags?.map((lt: any) => lt.tags) || []
    : item.user_tags?.map((ut: any) => ut.tags) || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do {isLead ? "Lead" : "Aluno"}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[calc(90vh-100px)] pr-4">
            <div className="space-y-6">
              {/* Header com info do usuário/lead */}
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={item.avatar_url} alt={item.name} />
                  <AvatarFallback className="text-lg">
                    {getInitials(item.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-foreground">
                      {formatName(item.name)}
                    </h3>
                    {isLead && <Badge variant="outline">Lead</Badge>}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {item.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{item.email}</span>
                      </div>
                    )}
                    {item.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{item.phone}</span>
                      </div>
                    )}
                    {item.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{item.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <TagIcon className="h-4 w-4" />
                    Tags
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsManageTagsOpen(true)}
                  >
                    Gerenciar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {itemTags.length > 0 ? (
                    itemTags.map((tag: Tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          borderColor: tag.color,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma tag atribuída</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Histórico de Negociação */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Histórico de Negociação</h4>

                {/* Add new note */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Adicionar nova observação..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <Button
                    size="sm"
                    onClick={() => createNoteMutation.mutate(newNote)}
                    disabled={!newNote.trim() || createNoteMutation.isPending}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Observação
                  </Button>
                </div>

                {/* Notes list */}
                <div className="space-y-4">
                  {notes && notes.length > 0 ? (
                    notes.map((note: any) => (
                      <div key={note.id} className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={note.profiles?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {getInitials(note.profiles?.name || "?")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {note.profiles?.name || "Usuário"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {note.note}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma observação registrada ainda
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ManageItemTagsDialog
        open={isManageTagsOpen}
        onOpenChange={setIsManageTagsOpen}
        item={item}
        isLead={isLead}
        tags={tags}
        currentTags={itemTags}
        onSuccess={() => {
          onRefetch();
          toast.success("Tags atualizadas!");
        }}
      />
    </>
  );
}
