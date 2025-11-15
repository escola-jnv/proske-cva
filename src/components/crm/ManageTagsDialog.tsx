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
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ManageTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface SortableTagItemProps {
  tag: any;
  onDelete: (id: string) => void;
}

function SortableTagItem({ tag, onDelete }: SortableTagItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-muted rounded-lg"
    >
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Badge
          variant="secondary"
          style={{
            backgroundColor: `${tag.color}20`,
            borderColor: tag.color,
            color: tag.color,
          }}
        >
          {tag.name}
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(tag.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ManageTagsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ManageTagsDialogProps) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !tags) return;

    if (active.id !== over.id) {
      const oldIndex = tags.findIndex((tag) => tag.id === active.id);
      const newIndex = tags.findIndex((tag) => tag.id === over.id);

      const newTags = arrayMove(tags, oldIndex, newIndex);

      // Update order_index for all tags
      try {
        const updates = newTags.map((tag, index) => ({
          id: tag.id,
          order_index: index,
        }));

        for (const update of updates) {
          await supabase
            .from("tags")
            .update({ order_index: update.order_index })
            .eq("id", update.id);
        }

        refetch();
        onSuccess();
        toast.success("Ordem das tags atualizada!");
      } catch (error) {
        console.error("Error updating tag order:", error);
        toast.error("Erro ao atualizar ordem das tags");
      }
    }
  };

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
            <Label>Tags Existentes (arraste para reordenar)</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tags && tags.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={tags.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {tags.map((tag) => (
                        <SortableTagItem
                          key={tag.id}
                          tag={tag}
                          onDelete={(id) => deleteTagMutation.mutate(id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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
