import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CRMCard } from "./CRMCard";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface SortableCRMCardProps {
  item: any;
  isLead: boolean;
  tags: Tag[];
  onRefetch: () => void;
  columnId: string;
}

export function SortableCRMCard({
  item,
  isLead,
  tags,
  onRefetch,
  columnId,
}: SortableCRMCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: "card",
      item,
      columnId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CRMCard item={item} isLead={isLead} tags={tags} onRefetch={onRefetch} />
    </div>
  );
}
