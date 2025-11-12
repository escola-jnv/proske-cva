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
  MessageSquare, 
  Users, 
  ChevronRight,
  Hash,
  BookOpen
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCommunities, setOpenCommunities] = useState<Set<string>>(new Set());
  
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

      let groupsData;

      if (isTeacherOrAdmin) {
        // Teachers and admins see all groups
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
        
        // Open current community by default
        const currentGroupId = location.pathname.split("/groups/")[1]?.split("/")[0];
        if (currentGroupId) {
          const currentGroup = groupsList.find((g) => g.id === currentGroupId);
          if (currentGroup) {
            setOpenCommunities(new Set([currentGroup.community_id]));
          }
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching sidebar data:", error);
      setLoading(false);
    }
  };

  const toggleCommunity = (communityId: string) => {
    setOpenCommunities((prev) => {
      const next = new Set(prev);
      if (next.has(communityId)) {
        next.delete(communityId);
      } else {
        next.add(communityId);
      }
      return next;
    });
  };

  const isActiveGroup = (groupId: string) => {
    return location.pathname.includes(`/groups/${groupId}`);
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
                const isOpen = openCommunities.has(community.id);

                return (
                  <Collapsible
                    key={community.id}
                    open={isOpen}
                    onOpenChange={() => toggleCommunity(community.id)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="w-full">
                          <div className="flex items-center gap-2 flex-1">
                            <BookOpen className="h-4 w-4 flex-shrink-0" />
                            {!isCollapsed && (
                              <>
                                <span className="flex-1 truncate text-left">
                                  {community.name}
                                </span>
                                <ChevronRight
                                  className={`h-4 w-4 transition-transform ${
                                    isOpen ? "rotate-90" : ""
                                  }`}
                                />
                              </>
                            )}
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      
                      {!isCollapsed && (
                        <CollapsibleContent>
                          <SidebarMenuSub>
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
                        </CollapsibleContent>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
