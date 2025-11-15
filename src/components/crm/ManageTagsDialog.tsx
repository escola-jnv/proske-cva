import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface ManageTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ManageTagsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ManageTagsDialogProps) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  const { data: tags, refetch } = useQuery({
    queryKey: ["manage-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const createTagMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const maxOrder = tags?.reduce((max, tag) => Math.max(max, tag.order_index), -1) ?? -1;

      const { error } = await supabase.from("tags").insert({
        name: newTagName,
        color: newTagColor,
        created_by: user.id,
        order_index: maxOrder + 1,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewTagName("");
      setNewTagColor("#3b82f6");
      refetch();
      onSuccess();
    },
    onError: () => {
      toast.error("Erro ao criar tag");
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      onSuccess();
      toast.success("Tag excluída!");
    },
    onError: () => {
      toast.error("Erro ao excluir tag");
    },
  });

  const colorPresets = [
    "#3b82f6", // blue
    "#ef4444", // red
    "#22c55e", // green
    "#f59e0b", // amber
    "#a855f7", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create new tag */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nova Tag</Label>
              <Input
                id="tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nome da tag"
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 items-center">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: newTagColor === color ? "#000" : "transparent",
                    }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
                <Input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-16 h-8"
                />
              </div>
            </div>

            <Button
              onClick={() => createTagMutation.mutate()}
              disabled={!newTagName.trim() || createTagMutation.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4" />
              Criar Tag
            </Button>
          </div>

          {/* Existing tags */}
          <div className="space-y-2">
            <Label>Tags Existentes</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tags && tags.length > 0 ? (
                tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <Badge
                      style={{
                        backgroundColor: `${tag.color}20`,
                        borderColor: tag.color,
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteTagMutation.mutate(tag.id)}
                      disabled={deleteTagMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma tag criada ainda
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
