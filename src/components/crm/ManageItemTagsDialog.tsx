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
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ManageItemTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  isLead: boolean;
  tags: Tag[];
  currentTags: Tag[];
  onSuccess: () => void;
}

export function ManageItemTagsDialog({
  open,
  onOpenChange,
  item,
  isLead,
  tags,
  currentTags,
  onSuccess,
}: ManageItemTagsDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(
    currentTags.map((t) => t.id)
  );

  const updateTagsMutation = useMutation({
    mutationFn: async () => {
      if (isLead) {
        // Delete all existing tags
        const { error: deleteError } = await supabase
          .from("lead_tags")
          .delete()
          .eq("lead_id", item.id);

        if (deleteError) throw deleteError;

        // Insert new tags
        if (selectedTags.length > 0) {
          const { error: insertError } = await supabase.from("lead_tags").insert(
            selectedTags.map((tagId) => ({
              lead_id: item.id,
              tag_id: tagId,
            }))
          );

          if (insertError) throw insertError;
        }
      } else {
        // Delete all existing tags
        const { error: deleteError } = await supabase
          .from("user_tags")
          .delete()
          .eq("user_id", item.id);

        if (deleteError) throw deleteError;

        // Insert new tags
        if (selectedTags.length > 0) {
          const { error: insertError } = await supabase.from("user_tags").insert(
            selectedTags.map((tagId) => ({
              user_id: item.id,
              tag_id: tagId,
            }))
          );

          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar tags");
    },
  });

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <Badge
                  key={tag.id}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer"
                  style={
                    isSelected
                      ? {
                          backgroundColor: tag.color,
                          borderColor: tag.color,
                        }
                      : {
                          borderColor: tag.color,
                          color: tag.color,
                        }
                  }
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                  {isSelected && <X className="h-3 w-3 ml-1" />}
                </Badge>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateTagsMutation.mutate()}
              disabled={updateTagsMutation.isPending}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
