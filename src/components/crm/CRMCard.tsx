import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin } from "lucide-react";
import { CRMDetailsDialog } from "./CRMDetailsDialog";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface CRMCardProps {
  item: any;
  isLead: boolean;
  tags: Tag[];
  onRefetch: () => void;
}

export function CRMCard({ item, isLead, tags, onRefetch }: CRMCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const itemTags = isLead
    ? item.lead_tags?.map((lt: any) => lt.tags) || []
    : item.user_tags?.map((ut: any) => ut.tags) || [];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsDetailsOpen(true)}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={item.avatar_url} alt={item.name} />
              <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{item.name}</p>
              {isLead && (
                <Badge variant="outline" className="text-xs">
                  Lead
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            {item.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{item.email}</span>
              </div>
            )}
            {item.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{item.phone}</span>
              </div>
            )}
            {item.city && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{item.city}</span>
              </div>
            )}
          </div>

          {itemTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {itemTags.map((tag: Tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-xs"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    borderColor: tag.color,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CRMDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        item={item}
        isLead={isLead}
        tags={tags}
        onRefetch={onRefetch}
      />
    </>
  );
}
