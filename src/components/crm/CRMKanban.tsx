import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CRMCard } from "./CRMCard";
import { SortableCRMCard } from "./SortableCRMCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
  color: string;
  order_index: number;
}

interface UserTag {
  tag_id: string;
  tags: Tag;
}

interface LeadTag {
  tag_id: string;
  tags: Tag;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  avatar_url: string;
  user_tags: UserTag[];
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  avatar_url: string;
  lead_tags: LeadTag[];
}

interface CRMKanbanProps {
  tags: Tag[];
  users: User[];
  leads: Lead[];
  onRefetch: () => void;
}

export function CRMKanban({ tags, users, leads, onRefetch }: CRMKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group users and leads by tags
  const getItemsForTag = (tagId: string) => {
    const tagUsers = users.filter((user) =>
      user.user_tags?.some((ut) => ut.tag_id === tagId)
    );
    const tagLeads = leads.filter((lead) =>
      lead.lead_tags?.some((lt) => lt.tag_id === tagId)
    );
    return [...tagUsers, ...tagLeads];
  };

  // Get items without tags
  const getItemsWithoutTags = () => {
    const usersWithoutTags = users.filter(
      (user) => !user.user_tags || user.user_tags.length === 0
    );
    const leadsWithoutTags = leads.filter(
      (lead) => !lead.lead_tags || lead.lead_tags.length === 0
    );
    return [...usersWithoutTags, ...leadsWithoutTags];
  };

  const columns = [
    { id: "no-tag", name: "Sem Tag", color: "#6b7280", items: getItemsWithoutTags() },
    ...tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      items: getItemsForTag(tag.id),
    })),
  ];

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeItem = [...users, ...leads].find((item) => item.id === active.id);
    if (!activeItem) return;

    const isLead = "lead_tags" in activeItem;
    const overColumnId = over.id as string;

    // If dropped on a different column, update tags
    if (overColumnId && overColumnId !== "no-tag") {
      try {
        if (isLead) {
          // Check if lead already has this tag
          const hasTag = activeItem.lead_tags?.some((lt) => lt.tag_id === overColumnId);
          if (!hasTag) {
            await supabase.from("lead_tags").insert({
              lead_id: activeItem.id,
              tag_id: overColumnId,
            });
            toast.success("Tag adicionada ao lead");
            onRefetch();
          }
        } else {
          // Check if user already has this tag
          const hasTag = activeItem.user_tags?.some((ut) => ut.tag_id === overColumnId);
          if (!hasTag) {
            await supabase.from("user_tags").insert({
              user_id: activeItem.id,
              tag_id: overColumnId,
            });
            toast.success("Tag adicionada ao usuário");
            onRefetch();
          }
        }
      } catch (error) {
        console.error("Error adding tag:", error);
        toast.error("Erro ao adicionar tag");
      }
    }
  };

  const activeItem = activeId
    ? [...users, ...leads].find((item) => item.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full whitespace-nowrap rounded-lg">
        <div className="flex gap-3 pb-4">
          {columns.map((column) => (
            <div
              key={column.id}
              id={column.id}
              className="flex-shrink-0 w-[280px] sm:w-80 bg-card rounded-lg border shadow-sm"
            >
              <div
                className="p-3 border-b"
                style={{ borderLeftColor: column.color, borderLeftWidth: "4px" }}
              >
                <h3 className="font-semibold text-sm sm:text-base text-foreground">{column.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {column.items.length} {column.items.length === 1 ? "item" : "itens"}
                </p>
              </div>
              <ScrollArea className="h-[calc(100vh-280px)] p-3">
                <SortableContext
                  items={column.items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {column.items.map((item) => (
                      <SortableCRMCard
                        key={item.id}
                        item={item}
                        isLead={"lead_tags" in item}
                        tags={tags}
                        onRefetch={onRefetch}
                        columnId={column.id}
                      />
                    ))}
                  </div>
                </SortableContext>
              </ScrollArea>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <DragOverlay>
        {activeItem && (
          <div className="opacity-80 w-[280px] sm:w-80">
            <CRMCard
              item={activeItem}
              isLead={"lead_tags" in activeItem}
              tags={tags}
              onRefetch={onRefetch}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
