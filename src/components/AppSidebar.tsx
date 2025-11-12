import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  Home, 
  Hash,
  BookOpen,
  Settings,
  GraduationCap,
  Calendar
} from "lucide-react";

type Community = {
  id: string;
  name: string;
  subject: string;
};

type Group = {
  id: string;
  name: string;
  community_id: string;
};

type Course = {
  id: string;
  name: string;
  community_id: string;
};

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const isCollapsed = state === "collapsed";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is teacher or admin
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isTeacherOrAdmin = userRoles?.some(
        (r) => r.role === "teacher" || r.role === "admin"
      );

      const admin = userRoles?.some((r) => r.role === "admin");
      setIsAdmin(admin || false);

      let groupsData;

      if (isTeacherOrAdmin) {
        // Teachers and admins see all groups and courses
        const { data } = await supabase
          .from("conversation_groups")
          .select(`
            id,
            name,
            community_id,
            communities (
              id,
              name,
              subject
            )
          `)
          .order("created_at", { ascending: false });
        groupsData = data;

        // Fetch all courses
        const { data: coursesData } = await supabase
          .from("courses")
          .select("id, name, community_id")
          .order("created_at", { ascending: false });
        setCourses(coursesData || []);
      } else {
        // Students see only their groups
        const { data: membershipData } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", user.id);

        const groupIds = membershipData?.map((m) => m.group_id) || [];

        if (groupIds.length === 0) {
          setGroups([]);
          setCommunities([]);
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("conversation_groups")
          .select(`
            id,
            name,
            community_id,
            communities (
              id,
              name,
              subject
            )
          `)
          .in("id", groupIds);
        groupsData = data;

        // Students see all courses in their communities
        const communityIds = data?.map((g: any) => {
          const comm = Array.isArray(g.communities) ? g.communities[0] : g.communities;
          return comm?.id;
        }).filter(Boolean) || [];

        if (communityIds.length > 0) {
          const { data: coursesData } = await supabase
            .from("courses")
            .select("id, name, community_id")
            .in("community_id", communityIds)
            .order("created_at", { ascending: false });
          setCourses(coursesData || []);
        }
      }

      if (groupsData) {
        const groupsList: Group[] = groupsData.map((g: any) => ({
          id: g.id,
          name: g.name,
          community_id: g.community_id,
        }));

        const communitiesMap = new Map<string, Community>();
        groupsData.forEach((g: any) => {
          if (g.communities) {
            const comm = Array.isArray(g.communities) ? g.communities[0] : g.communities;
            if (comm && !communitiesMap.has(comm.id)) {
              communitiesMap.set(comm.id, {
                id: comm.id,
                name: comm.name,
                subject: comm.subject,
              });
            }
          }
        });

        setGroups(groupsList);
        setCommunities(Array.from(communitiesMap.values()));
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching sidebar data:", error);
      setLoading(false);
    }
  };

  const isActiveGroup = (groupId: string) => {
    return location.pathname.includes(`/groups/${groupId}`);
  };

  const isActiveCourse = (courseId: string) => {
    return location.pathname.includes(`/courses/${courseId}`);
  };

  if (loading) {
    return (
      <Sidebar className={isCollapsed ? "w-14" : "w-64"}>
        <SidebarContent>
          <div className="p-4 text-sm text-muted-foreground">
            Carregando...
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"}>
      <SidebarContent>
        {/* Home */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/communities")}
                isActive={location.pathname === "/communities"}
              >
                <Home className="h-4 w-4" />
                {!isCollapsed && <span>Início</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/events")}
                isActive={location.pathname === "/events"}
              >
                <Calendar className="h-4 w-4" />
                {!isCollapsed && <span>Agenda</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Communities and Groups */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!isCollapsed && "Comunidades"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {communities.map((community) => {
                const communityGroups = groups.filter(
                  (g) => g.community_id === community.id
                );
                const communityCourses = courses.filter(
                  (c) => c.community_id === community.id
                );

                return (
                  <div key={community.id}>
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
                      <SidebarMenuSub>
                        {/* Courses */}
                        {communityCourses.map((course) => (
                          <SidebarMenuSubItem key={course.id}>
                            <SidebarMenuSubButton
                              onClick={() => navigate(`/courses/${course.id}`)}
                              isActive={isActiveCourse(course.id)}
                            >
                              <GraduationCap className="h-3 w-3" />
                              <span className="truncate">{course.name}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                        
                        {/* Groups */}
                        {communityGroups.map((group) => (
                          <SidebarMenuSubItem key={group.id}>
                            <SidebarMenuSubButton
                              onClick={() => navigate(`/groups/${group.id}/chat`)}
                              isActive={isActiveGroup(group.id)}
                            >
                              <Hash className="h-3 w-3" />
                              <span className="truncate">{group.name}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </div>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dev Tools - Only for Admins */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/dev-tools")}
                  isActive={location.pathname === "/dev-tools"}
                >
                  <Settings className="h-4 w-4" />
                  {!isCollapsed && <span>Dev Tools</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
