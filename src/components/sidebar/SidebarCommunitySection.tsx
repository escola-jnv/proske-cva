import { BookOpen, Calendar, Users, FileText, GraduationCap } from "lucide-react";
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

  const isActiveSection = (path: string) => {
    return location.pathname.includes(path);
  };

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
          onClick={() => navigate(`/communities/${community.id}/groups`)}
          isActive={isActiveSection(`/communities/${community.id}/`)}
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
          {/* Groups */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate(`/communities/${community.id}/groups`)}
              isActive={isActiveSection(`/communities/${community.id}/groups`)}
              className="pl-6"
            >
              <Users className="h-3 w-3" />
              <span>Grupos</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Group items */}
          {isActiveSection(`/communities/${community.id}/groups`) && groups.map((group) => (
            <SidebarGroupItem
              key={group.id}
              group={group}
              isActive={isActiveGroup(group.id)}
              onClick={() => onGroupClick(group)}
            />
          ))}

          {/* Tasks */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate(`/communities/${community.id}/tasks`)}
              isActive={isActiveSection(`/communities/${community.id}/tasks`)}
              className="pl-6"
            >
              <FileText className="h-3 w-3" />
              <span>Tarefas</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Events */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate(`/communities/${community.id}/events`)}
              isActive={isActiveSection(`/communities/${community.id}/events`)}
              className="pl-6"
            >
              <Calendar className="h-3 w-3" />
              <span>Eventos</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Courses */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate(`/communities/${community.id}/courses`)}
              isActive={isActiveSection(`/communities/${community.id}/courses`)}
              className="pl-6"
            >
              <GraduationCap className="h-3 w-3" />
              <span>Cursos</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Course items */}
          {isActiveSection(`/communities/${community.id}/courses`) && courses.map((course) => (
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
        </>
      )}
    </div>
  );
}
