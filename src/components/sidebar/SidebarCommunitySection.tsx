import { BookOpen, Calendar } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { SidebarGroupItem } from "./SidebarGroupItem";

interface Community {
  id: string;
  name: string;
  subject: string;
}

interface Group {
  id: string;
  name: string;
  community_id: string;
  unread_count?: number;
  has_access: boolean;
  required_plan_names?: string[];
}

interface Course {
  id: string;
  name: string;
  community_id: string;
}

interface SidebarCommunitySectionProps {
  community: Community;
  groups: Group[];
  courses: Course[];
  isCollapsed: boolean;
  onGroupClick: (group: Group) => void;
}

export function SidebarCommunitySection({
  community,
  groups,
  courses,
  isCollapsed,
  onGroupClick
}: SidebarCommunitySectionProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActiveGroup = (groupId: string) => {
    return location.pathname.includes(`/groups/${groupId}`);
  };

  const isActiveCourse = (courseId: string) => {
    return location.pathname.includes(`/courses/${courseId}`);
  };

  return (
    <div>
      <SidebarMenuItem>
        <SidebarMenuButton 
          className="w-full cursor-pointer"
          onClick={() => navigate(`/communities/${community.id}/manage`)}
          isActive={location.pathname.includes(`/communities/${community.id}/manage`)}
        >
          <div className="flex items-center gap-2 flex-1">
            <BookOpen className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && (
              <span className="flex-1 truncate text-left font-semibold">
                {community.name}
              </span>
            )}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
      
      {!isCollapsed && (
        <>
          {/* Agenda */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate("/events")}
              isActive={location.pathname === "/events"}
            >
              <Calendar className="h-3 w-3" />
              <span>Agenda</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Courses */}
          {courses.map((course) => (
            <SidebarMenuSubItem key={course.id}>
              <SidebarMenuSubButton
                onClick={() => navigate(`/courses/${course.id}`)}
                isActive={isActiveCourse(course.id)}
              >
                <BookOpen className="h-3 w-3" />
                <span className="truncate">{course.name}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
          
          {/* Groups */}
          {groups.map((group) => (
            <SidebarGroupItem
              key={group.id}
              group={group}
              isActive={isActiveGroup(group.id)}
              onClick={() => onGroupClick(group)}
            />
          ))}
        </>
      )}
    </div>
  );
}
