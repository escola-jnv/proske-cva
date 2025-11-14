import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogOut, FileText, DollarSign, Settings } from "lucide-react";
import { toast } from "sonner";
import { UpgradePlanDialog } from "@/components/UpgradePlanDialog";
import { SidebarUserHeader } from "@/components/sidebar/SidebarUserHeader";
import { SidebarCommunitySection } from "@/components/sidebar/SidebarCommunitySection";

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
  required_plan_ids?: string[];
  required_plan_names?: string[];
  has_access: boolean;
};

type Course = {
  id: string;
  name: string;
  community_id: string;
};

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
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
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('student');
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [userPlanId, setUserPlanId] = useState<string | null>(null);
  const [upgradePlanDialog, setUpgradePlanDialog] = useState<{
    open: boolean;
    planNames: string[];
    groupName: string;
  }>({ open: false, planNames: [], groupName: "" });
  
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

      // Check user roles
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
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subscriptionData?.subscription_plans) {
        const planData: any = subscriptionData.subscription_plans;
        setUserPlan(planData.name);
        setUserPlanId(subscriptionData.plan_id);
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
        // Students see only groups they have access to via plans
        // Fetch all visible groups
        const { data: allGroupsData } = await supabase
          .from("conversation_groups")
          .select(`
            id,
            name,
            community_id,
            is_visible,
            communities (
              id,
              name,
              subject
            )
          `)
          .eq("is_visible", true)
          .order("created_at", { ascending: false });

        // Fetch plan requirements for all groups
        const { data: planLinks } = await supabase
          .from("plan_default_groups")
          .select(`
            group_id,
            plan_id,
            subscription_plans (
              id,
              name
            )
          `);

        // Group all plan IDs by group_id (since a group can have multiple plans)
        const planLinkMap = new Map<string, { plan_ids: string[], plan_names: string[] }>();
        planLinks?.forEach(link => {
          const groupId = link.group_id;
          const planId = (link.subscription_plans as any)?.id;
          const planName = (link.subscription_plans as any)?.name;
          
          if (!planLinkMap.has(groupId)) {
            planLinkMap.set(groupId, { plan_ids: [], plan_names: [] });
          }
          
          const groupPlans = planLinkMap.get(groupId)!;
          if (planId) groupPlans.plan_ids.push(planId);
          if (planName) groupPlans.plan_names.push(planName);
        });

        // Determine which groups user has access to based ONLY on their plan
        groupsData = allGroupsData?.map((g: any) => {
          const planReq = planLinkMap.get(g.id);
          // User has access if: no plan required OR user has ANY of the required plans
          const hasAccess = !planReq || planReq.plan_ids.length === 0 || planReq.plan_ids.includes(userPlanId);
          
          return {
            ...g,
            required_plan_ids: planReq?.plan_ids || [],
            required_plan_names: planReq?.plan_names || [],
            has_access: hasAccess
          };
        });

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
              required_plan_id: g.required_plan_id || null,
              required_plan_name: g.required_plan_name || null,
              has_access: g.has_access ?? true
            };
          })
        );

        // Sort by custom order
        groupsWithUnread.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

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

  const handleGroupClick = (group: Group) => {
    const hasAccess = group.has_access !== false;
    
    if (!hasAccess) {
      setUpgradePlanDialog({
        open: true,
        planNames: group.required_plan_names || ["Plano Premium"],
        groupName: group.name
      });
    } else {
      navigate(`/groups/${group.id}/chat`);
    }
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
        <SidebarUserHeader
          userProfile={userProfile}
          userRole={userRole}
          userPlan={userPlan}
          isCollapsed={isCollapsed}
          onClick={() => navigate("/profile")}
        />
      </SidebarHeader>

      <SidebarContent>
        {/* Assinatura */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/plans")}
                  className="bg-primary/10 hover:bg-primary/20 font-semibold"
                >
                  <span className="text-primary">💎</span>
                  {!isCollapsed && <span>Assinatura</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Comunidades */}
        <SidebarGroup>
          <SidebarGroupLabel>Comunidades</SidebarGroupLabel>
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
                  <SidebarCommunitySection
                    key={community.id}
                    community={community}
                    groups={communityGroups}
                    courses={communityCourses}
                    isCollapsed={isCollapsed}
                    onGroupClick={handleGroupClick}
                  />
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
              >
                <FileText className="h-4 w-4" />
                {!isCollapsed && <span>Tarefas</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Admin Tools - Apenas para Admins */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/financial")}
                >
                  <DollarSign className="h-4 w-4" />
                  {!isCollapsed && <span>Financeiro</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/dev-tools")}
                >
                  <Settings className="h-4 w-4" />
                  {!isCollapsed && <span>DevTools</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer com Logout */}
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

      <UpgradePlanDialog
        open={upgradePlanDialog.open}
        onOpenChange={(open) => setUpgradePlanDialog({ ...upgradePlanDialog, open })}
        planNames={upgradePlanDialog.planNames}
        groupName={upgradePlanDialog.groupName}
      />
    </Sidebar>
  );
}
