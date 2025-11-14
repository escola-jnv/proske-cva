import { MessageCircle } from "lucide-react";
import { SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

interface SidebarGroupItemProps {
  group: {
    id: string;
    name: string;
    unread_count?: number;
    has_access: boolean;
    required_plan_name?: string | null;
  };
  isActive: boolean;
  onClick: () => void;
}

export function SidebarGroupItem({ group, isActive, onClick }: SidebarGroupItemProps) {
  const hasAccess = group.has_access !== false;

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        onClick={onClick}
        isActive={isActive && hasAccess}
        className={!hasAccess ? "opacity-40 hover:opacity-60 transition-opacity" : ""}
      >
        <MessageCircle className="h-3 w-3" />
        <span className="truncate flex-1">{group.name}</span>
        {hasAccess && group.unread_count && group.unread_count > 0 && (
          <Badge 
            variant="destructive" 
            className="ml-auto h-5 min-w-[20px] flex items-center justify-center text-xs px-1.5"
          >
            {group.unread_count > 99 ? "99+" : group.unread_count}
          </Badge>
        )}
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}
