import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CRMCard } from "./CRMCard";

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

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-4 pb-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className="flex-shrink-0 w-80 bg-card rounded-lg border shadow-sm"
          >
            <div
              className="p-4 border-b"
              style={{ borderLeftColor: column.color, borderLeftWidth: "4px" }}
            >
              <h3 className="font-semibold text-foreground">{column.name}</h3>
              <p className="text-sm text-muted-foreground">
                {column.items.length} {column.items.length === 1 ? "item" : "itens"}
              </p>
            </div>
            <ScrollArea className="h-[calc(100vh-300px)] p-4">
              <div className="space-y-3">
                {column.items.map((item) => (
                  <CRMCard
                    key={item.id}
                    item={item}
                    isLead={"lead_tags" in item}
                    tags={tags}
                    onRefetch={onRefetch}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
