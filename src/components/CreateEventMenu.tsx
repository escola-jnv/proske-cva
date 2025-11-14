import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Calendar, Users, Video, BookOpen, BookMarked } from "lucide-react";
import { CreateEventDialog } from "./CreateEventDialog";
import { CreateIndividualStudyDialog } from "./CreateIndividualStudyDialog";

type CreateEventMenuProps = {
  communityId: string;
  userId: string;
  isAdmin?: boolean;
  onSuccess?: () => void;
};

export const CreateEventMenu = ({
  communityId,
  userId,
  isAdmin = false,
  onSuccess,
}: CreateEventMenuProps) => {
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [studyDialogOpen, setStudyDialogOpen] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<
    "interview" | "mentoring" | "group_study" | "live"
  >("group_study");

  const handleEventTypeSelect = (
    type: "interview" | "mentoring" | "group_study" | "live"
  ) => {
    setSelectedEventType(type);
    setEventDialogOpen(true);
  };

  const handleIndividualStudy = () => {
    setStudyDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Criar Evento
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleIndividualStudy}>
            <BookMarked className="h-4 w-4 mr-2" />
            Estudo Individual
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleEventTypeSelect("group_study")}>
            <Users className="h-4 w-4 mr-2" />
            Estudo em Grupo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleEventTypeSelect("mentoring")}>
            <BookOpen className="h-4 w-4 mr-2" />
            Monitoria
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleEventTypeSelect("live")}>
            <Video className="h-4 w-4 mr-2" />
            Live
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleEventTypeSelect("interview")}>
            <Calendar className="h-4 w-4 mr-2" />
            Entrevista
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateEventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        communityId={communityId}
        userId={userId}
        isAdmin={isAdmin}
        initialEventType={selectedEventType}
        onSuccess={onSuccess}
      />

      <CreateIndividualStudyDialog
        open={studyDialogOpen}
        onOpenChange={setStudyDialogOpen}
        userId={userId}
        communityId={communityId}
        onSuccess={onSuccess}
      />
    </>
  );
};
