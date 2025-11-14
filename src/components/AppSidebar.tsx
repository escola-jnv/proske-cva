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
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle,
  BookOpen,
  Settings,
  Calendar,
  CreditCard,
  Users,
  MessageSquare,
  CalendarDays,
  Upload,
  LogOut,
  FileText,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";

type Community = {
  id: string;
  name: string;
  subject: string;
};

type Group = {
  id: string;
  name: string;
  community_id: string;
  unread_count?: number;
  order_index?: number;
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
  const [isTeacherOrAdmin, setIsTeacherOrAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    name: string;
    avatar_url: string | null;
  } | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('student');
  const [userPlan, setUserPlan] = useState<string | null>(null);
  
  const isCollapsed = state === "collapsed";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user.id)
        .single();
      
      if (profileData) {
        setUserProfile(profileData);
      }

      // Check if user is teacher or admin
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isTeacherOrAdmin = userRoles?.some(
        (r) => r.role === "teacher" || r.role === "admin"
      );
      setIsTeacherOrAdmin(isTeacherOrAdmin);

      const admin = userRoles?.some((r) => r.role === "admin");
      setIsAdmin(admin || false);

      // Set user role for display
      if (admin) {
        setUserRole('admin');
      } else if (userRoles?.some((r) => r.role === "teacher")) {
        setUserRole('teacher');
      } else if (userRoles?.some((r) => r.role === "visitor" as any)) {
        setUserRole('visitor');
      } else {
        setUserRole('student');
      }

      // Fetch user's active subscription plan
      const { data: subscriptionData } = await supabase
        .from('user_subscriptions')
        .select(`
          plan_id,
          subscription_plans (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subscriptionData?.subscription_plans) {
        const planData: any = subscriptionData.subscription_plans;
        setUserPlan(planData.name);
      }

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
        // Students see only their groups and courses with access
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

        // Fetch courses the user has active access to
        const { data: courseAccessData } = await supabase
          .from("user_course_access" as any)
          .select(`
            course_id,
            end_date,
            courses (
              id,
              name,
              community_id
            )
          `)
          .eq("user_id", user.id)
          .gt("end_date", new Date().toISOString());

        const accessibleCourses = courseAccessData
          ?.map((access: any) => ({
            ...access.courses,
            access_end_date: access.end_date,
          }))
          .filter((course) => course.id) || [];

        setCourses(accessibleCourses);
      }

      if (groupsData) {
        // Fetch user's custom order
        const { data: orderData } = await supabase
          .from('user_menu_order')
          .select('item_id, order_index')
          .eq('user_id', user.id)
          .eq('item_type', 'group');

        const orderMap = new Map(
          orderData?.map(o => [o.item_id, o.order_index]) || []
        );

        // Fetch unread counts for each group
        const groupsWithUnread = await Promise.all(
          groupsData.map(async (g: any, index: number) => {
            const { data: unreadData } = await supabase
              .rpc('get_unread_count', { 
                _user_id: user.id, 
                _group_id: g.id 
              });
            
            return {
              id: g.id,
              name: g.name,
              community_id: g.community_id,
              unread_count: unreadData || 0,
              order_index: orderMap.get(g.id) ?? index,
            };
          })
        );

        // Sort by custom order
        groupsWithUnread.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        const totalUnread = groupsWithUnread.reduce((sum, g) => sum + (g.unread_count || 0), 0);
        setTotalUnreadCount(totalUnread);

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

        setGroups(groupsWithUnread);
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast.success("Logout realizado com sucesso");
    } catch (error: any) {
      toast.error("Erro ao fazer logout: " + error.message);
    }
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
      {/* User Profile Header */}
      <SidebarHeader>
        <div className="flex flex-col gap-2 p-3 cursor-pointer hover:bg-muted/50 rounded-md transition-colors" onClick={() => navigate("/profile")}>
          {isCollapsed ? (
            <Avatar className="h-8 w-8 mx-auto">
              <AvatarImage src={userProfile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10">
                {userProfile?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10">
                    {userProfile?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {userProfile?.name || "Usuário"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap ml-1">
                {/* Role Badge */}
                <Badge 
                  variant={
                    userRole === 'admin' ? 'default' : 
                    userRole === 'teacher' ? 'secondary' : 
                    userRole === 'visitor' ? 'outline' : 
                    'outline'
                  }
                  className={
                    userRole === 'admin' ? 'bg-destructive text-destructive-foreground' :
                    userRole === 'teacher' ? 'bg-primary text-primary-foreground' :
                    userRole === 'visitor' ? 'border-muted-foreground/50' :
                    'border-muted-foreground/30'
                  }
                >
                   {userRole === 'admin' ? '👑 Admin' :
                   userRole === 'teacher' ? '📚 Professor' :
                   userRole === 'visitor' ? '👤 Visitante' :
                   '🎓 Aluno'}
                </Badge>

                {/* Plan Badge */}
                {userPlan && (
                  <Badge 
                    variant="secondary"
                    className="bg-accent text-accent-foreground"
                  >
                    💎 {userPlan}
                  </Badge>
                )}
              </div>
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Assinatura - Destaque no topo */}
        <SidebarGroup className="border-b border-border pb-4 mb-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/plans")}
                isActive={location.pathname === "/plans"}
                className="bg-primary/10 hover:bg-primary/20 text-primary font-medium"
              >
                <CreditCard className="h-4 w-4" />
                {!isCollapsed && <span>Assinatura</span>}
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
                    
                    {/* Grupos e Cursos - Todos na mesma hierarquia */}
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
                        {communityCourses.map((course) => (
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
                        {communityGroups.map((group) => {
                          const isMember = isTeacherOrAdmin || groups.some(g => g.id === group.id);
                          const isRestricted = userRole === 'visitor' && !isMember;
                          
                          const handleGroupClick = () => {
                            if (isRestricted) {
                              toast.error("Este grupo não está liberado para o seu plano");
                            } else {
                              navigate(`/groups/${group.id}/chat`);
                            }
                          };
                          
                          return (
                            <SidebarMenuSubItem key={group.id}>
                              <SidebarMenuSubButton
                                onClick={handleGroupClick}
                                isActive={isActiveGroup(group.id)}
                                className={isRestricted ? "opacity-60 cursor-not-allowed" : ""}
                              >
                                <MessageCircle className="h-3 w-3" />
                                <span className="truncate flex-1">{group.name}</span>
                                {group.unread_count && group.unread_count > 0 && (
                                  <Badge 
                                    variant="destructive" 
                                    className="h-5 min-w-5 px-1.5 text-xs rounded-full"
                                  >
                                    {group.unread_count > 99 ? '99+' : group.unread_count}
                                  </Badge>
                                )}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tarefas */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/tasks")}
                isActive={location.pathname === "/tasks"}
              >
                <FileText className="h-4 w-4" />
                {!isCollapsed && <span>Tarefas</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Admin Tools */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/financial")}
                  isActive={location.pathname === "/financial"}
                >
                  <DollarSign className="h-4 w-4" />
                  {!isCollapsed && <span>Financeiro</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/dev-tools")}
                  isActive={location.pathname === "/dev-tools"}
                >
                  <Settings className="h-4 w-4" />
                  {!isCollapsed && <span>Dev Tools</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {!isCollapsed && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => navigate("/dev-tools?tab=users")}
                      isActive={location.pathname === "/dev-tools" && location.search.includes("tab=users")}
                    >
                      <Users className="h-3 w-3" />
                      <span>Usuários</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => navigate("/dev-tools?tab=communities")}
                      isActive={location.pathname === "/dev-tools" && location.search.includes("tab=communities")}
                    >
                      <BookOpen className="h-3 w-3" />
                      <span>Comunidades</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => navigate("/dev-tools?tab=groups")}
                      isActive={location.pathname === "/dev-tools" && location.search.includes("tab=groups")}
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>Grupos</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => navigate("/dev-tools?tab=events")}
                      isActive={location.pathname === "/dev-tools" && location.search.includes("tab=events")}
                    >
                      <CalendarDays className="h-3 w-3" />
                      <span>Eventos</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => navigate("/dev-tools?tab=import")}
                      isActive={location.pathname === "/dev-tools" && location.search.includes("tab=import")}
                    >
                      <Upload className="h-3 w-3" />
                      <span>Importação</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Logout Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
