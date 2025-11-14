import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2, Users, FolderOpen, MessageSquare, Calendar, Search, Upload, FileText, Plus, DollarSign, BookOpen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ManageCourseAccessDialog } from "@/components/ManageCourseAccessDialog";
import { DevToolsCoursesTab } from "./DevToolsCoursesTab";

type Profile = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  bio?: string;
  avatar_url?: string;
  role?: string;
  subscription?: {
    plan_name: string;
    price: number;
    end_date: string;
    status: string;
  };
};

type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  description?: string;
  billing_frequency?: string;
  monthly_corrections_limit?: number;
  monthly_monitorings_limit?: number;
  checkout_url?: string;
  default_groups?: string[];
};

type Community = {
  id: string;
  name: string;
  description?: string;
  subject: string;
  created_by: string;
};

type Group = {
  id: string;
  name: string;
  description?: string;
  community_id: string;
  community_name?: string;
  students_can_message: boolean;
  is_visible: boolean;
  member_count?: number;
  online_count?: number;
  messages_per_hour?: number;
};

type Event = {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  duration_minutes: number;
  community_id: string;
  created_by: string;
};

type Course = {
  id: string;
  name: string;
  description?: string;
  community_id: string;
  cover_image_url?: string;
  price?: number;
  checkout_url?: string;
  is_visible: boolean;
  created_by: string;
};

type UserCourseAccess = {
  id: string;
  user_id: string;
  course_id: string;
  course_name?: string;
  user_name?: string;
  start_date: string;
  end_date: string;
  granted_by: string;
};

export default function DevTools() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseAccess, setCourseAccess] = useState<UserCourseAccess[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    type: "profile" | "community" | "group" | "event" | "course" | null;
    data: any | null;
  }>({ open: false, type: null, data: null });
  
  const [courseAccessDialog, setCourseAccessDialog] = useState<{
    open: boolean;
    userId: string | null;
    userName: string | null;
  }>({ open: false, userId: null, userName: null });
  
  const [courseAccessForm, setCourseAccessForm] = useState<{
    course_id: string;
    end_date: string;
  }>({ course_id: "", end_date: "" });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "profile" | "community" | "group" | "event" | "course" | "course_access" | null;
    id: string | null;
  }>({ open: false, type: null, id: null });

  const [linkDialog, setLinkDialog] = useState<{
    open: boolean;
    userId: string | null;
    type: "communities" | "groups" | "courses" | null;
  }>({ open: false, userId: null, type: null });

  const [subscriptionDialog, setSubscriptionDialog] = useState<{
    open: boolean;
    userId: string | null;
    userName: string | null;
    currentSubscription: any | null;
  }>({ open: false, userId: null, userName: null, currentSubscription: null });

  const [userLinks, setUserLinks] = useState<{
    communities: string[];
    groups: string[];
    courses: string[];
  }>({ communities: [], groups: [], courses: [] });

  const [availableCourses, setAvailableCourses] = useState<Array<{ id: string; name: string }>>([]);

  const [importLoading, setImportLoading] = useState(false);
  const [usersCSV, setUsersCSV] = useState("");
  const [lessonsCSV, setLessonsCSV] = useState("");
  
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [selectedCommunityForEvent, setSelectedCommunityForEvent] = useState<string>("");
  
  const [planDialog, setPlanDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    data: SubscriptionPlan | null;
  }>({ open: false, mode: "create", data: null });
  
  const [selectedDefaultGroups, setSelectedDefaultGroups] = useState<string[]>([]);
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkEditDialog, setBulkEditDialog] = useState<{
    open: boolean;
    data: {
      role?: string;
      planId?: string;
      dueDay?: number;
      groupIds?: string[];
    };
  }>({ open: false, data: {} });
  
  const activeTab = searchParams.get("tab") || "users";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
    setSearchTerm("");
  };

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const admin = roles?.some((r) => r.role === "admin");
      
      if (!admin) {
        toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
        navigate("/communities");
        return;
      }

      setIsAdmin(true);
      await fetchAllData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao verificar permissões");
      navigate("/communities");
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [profilesRes, communitiesRes, groupsRes, eventsRes, coursesRes, plansRes, courseAccessRes] = await Promise.all([
        supabase.from("profiles").select("*").order("name"),
        supabase.from("communities").select("*").order("name"),
        supabase.from("conversation_groups").select(`
          *,
          communities (
            name
          )
        `).order("name"),
        supabase.from("events").select("*").order("event_date", { ascending: false }),
        supabase.from("courses").select("*").order("name"),
        supabase.from("subscription_plans").select("*").order("name"),
        supabase.from("user_course_access" as any).select(`
          *,
          courses (name),
          profiles (name)
        `).order("end_date", { ascending: false }),
      ]);

      if (coursesRes.data) {
        setAvailableCourses(coursesRes.data);
        setCourses(coursesRes.data);
      }
      
      if (courseAccessRes.data) {
        const formattedAccess = courseAccessRes.data.map((access: any) => ({
          ...access,
          course_name: access.courses?.name,
          user_name: access.profiles?.name,
        }));
        setCourseAccess(formattedAccess);
      }
      
      // Fetch plans with default groups
      if (plansRes.data) {
        const plansWithGroups = await Promise.all(
          plansRes.data.map(async (plan) => {
            const { data: defaultGroups } = await supabase
              .from("plan_default_groups")
              .select("group_id")
              .eq("plan_id", plan.id);
            
            return {
              ...plan,
              default_groups: defaultGroups?.map(g => g.group_id) || []
            };
          })
        );
        setSubscriptionPlans(plansWithGroups);
      }

      // Fetch roles and subscriptions for each profile
      if (profilesRes.data) {
        const profilesWithRolesAndSubs = await Promise.all(
          profilesRes.data.map(async (profile) => {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.id)
              .limit(1)
              .single();
            
            // Fetch active subscription
            const { data: subData } = await supabase
              .from("user_subscriptions")
              .select(`
                end_date,
                status,
                subscription_plans (
                  name,
                  price
                )
              `)
              .eq("user_id", profile.id)
              .eq("status", "active")
              .order("end_date", { ascending: false })
              .limit(1)
              .single();
            
            return {
              ...profile,
              role: roleData?.role || "student",
              subscription: subData ? {
                plan_name: (subData.subscription_plans as any)?.name || "-",
                price: (subData.subscription_plans as any)?.price || 0,
                end_date: subData.end_date,
                status: subData.status,
              } : undefined,
            };
          })
        );
        setProfiles(profilesWithRolesAndSubs);
      }
      
      if (communitiesRes.data) setCommunities(communitiesRes.data);
      
      // Fetch groups with additional data
      if (groupsRes.data) {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        
        const groupsWithStats = await Promise.all(
          groupsRes.data.map(async (group: any) => {
            // Count members
            const { count: memberCount } = await supabase
              .from("group_members")
              .select("*", { count: "exact", head: true })
              .eq("group_id", group.id);

            // Count online members (last_active_at within 2 hours)
            const { data: onlineMembers } = await supabase
              .from("group_members")
              .select("user_id")
              .eq("group_id", group.id);

            let onlineCount = 0;
            if (onlineMembers) {
              const { data: onlineProfiles } = await supabase
                .from("profiles")
                .select("id")
                .in("id", onlineMembers.map(m => m.user_id))
                .gte("last_active_at", twoHoursAgo);
              
              onlineCount = onlineProfiles?.length || 0;
            }

            // Calculate messages per hour
            const { data: messages, error: messagesError } = await supabase
              .from("messages")
              .select("created_at")
              .eq("group_id", group.id)
              .order("created_at", { ascending: true });

            let messagesPerHour = 0;
            if (messages && messages.length > 0) {
              const firstMessage = new Date(messages[0].created_at);
              const lastMessage = new Date(messages[messages.length - 1].created_at);
              const hoursDiff = (lastMessage.getTime() - firstMessage.getTime()) / (1000 * 60 * 60);
              
              if (hoursDiff > 0) {
                messagesPerHour = Math.round((messages.length / hoursDiff) * 10) / 10;
              }
            }

            const communityName = Array.isArray(group.communities) 
              ? group.communities[0]?.name 
              : group.communities?.name;

            return {
              ...group,
              community_name: communityName || "-",
              member_count: memberCount || 0,
              online_count: onlineCount,
              messages_per_hour: messagesPerHour,
            };
          })
        );
        
        setGroups(groupsWithStats);
      }
      
      if (eventsRes.data) setEvents(eventsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (type: "profile" | "community" | "group" | "event" | "course", data: any) => {
    if (type === "profile") {
      // Fetch subscription data for the user
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("user_id", data.id)
        .eq("status", "active")
        .maybeSingle();

      // Fetch profile data for monitoring settings
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.id)
        .single();

      setEditDialog({ 
        open: true, 
        type, 
        data: { 
          ...data,
          ...profileData,
          planId: subscription?.plan_id || "",
          customPrice: subscription?.custom_price || subscription?.subscription_plans?.price || 0,
          dueDay: subscription?.due_day || 1,
          monitoringDayOfWeek: profileData?.monitoring_day_of_week,
          monitoringTime: profileData?.monitoring_time,
          weeklySubmissionsLimit: profileData?.weekly_submissions_limit || 0
        } 
      });
    } else {
      setEditDialog({ open: true, type, data: { ...data } });
    }
  };

  const handleSave = async () => {
    const { type, data } = editDialog;
    if (!type || !data) return;

    try {
      if (type === "profile") {
        // Update profile
        const { role, planId, customPrice, dueDay, monitoringDayOfWeek, monitoringTime, weeklySubmissionsLimit, ...profileData } = data;
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
            city: profileData.city,
            monitoring_day_of_week: monitoringDayOfWeek,
            monitoring_time: monitoringTime,
            weekly_submissions_limit: weeklySubmissionsLimit
          })
          .eq("id", data.id);

        if (profileError) throw profileError;

        // Update role
        if (role) {
          // Delete existing role
          await supabase.from("user_roles").delete().eq("user_id", data.id);
          
          // Insert new role
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({ user_id: data.id, role });

          if (roleError) throw roleError;
        }

        // Update or create subscription if planId is provided
        if (planId) {
          const { data: existingSub } = await supabase
            .from("user_subscriptions")
            .select("id")
            .eq("user_id", data.id)
            .eq("status", "active")
            .maybeSingle();

          if (existingSub) {
            // Update existing subscription
            const { error: subError } = await supabase
              .from("user_subscriptions")
              .update({
                plan_id: planId,
                custom_price: customPrice > 0 ? customPrice : null,
                due_day: dueDay
              })
              .eq("id", existingSub.id);

            if (subError) throw subError;
          } else {
            // Create new subscription
            const { error: subError } = await supabase
              .from("user_subscriptions")
              .insert({
                user_id: data.id,
                plan_id: planId,
                custom_price: customPrice > 0 ? customPrice : null,
                due_day: dueDay,
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                status: "active"
              });

            if (subError) throw subError;
          }
        }
      } else {
        let table: string = "";
        let updateData: any = {};
        
        switch (type) {
          case "community":
            table = "communities";
            updateData = {
              name: data.name,
              subject: data.subject,
              description: data.description,
              cover_image_url: data.cover_image_url
            };
            break;
          case "group":
            table = "conversation_groups";
            updateData = {
              name: data.name,
              description: data.description,
              community_id: data.community_id,
              students_can_message: data.students_can_message,
              is_visible: data.is_visible
            };
            break;
          case "event":
            table = "events";
            updateData = {
              title: data.title,
              description: data.description,
              event_date: data.event_date,
              duration_minutes: data.duration_minutes,
              community_id: data.community_id
            };
            break;
          case "course":
            table = "courses";
            updateData = {
              name: data.name,
              description: data.description,
              community_id: data.community_id,
              cover_image_url: data.cover_image_url,
              price: data.price || 0,
              checkout_url: data.checkout_url,
              is_visible: data.is_visible
            };
            break;
        }

        // Check if creating (no id) or updating (has id)
        if (data.id) {
          // Update existing
          const { error } = await supabase
            .from(table as any)
            .update(updateData)
            .eq("id", data.id);

          if (error) throw error;
          
          // Update plan link for groups
          if (type === "group" && data.plan_id !== undefined) {
            // Remove existing plan links
            await supabase
              .from("plan_default_groups")
              .delete()
              .eq("group_id", data.id);
            
            // Add new plan link if plan is selected
            if (data.plan_id) {
              await supabase
                .from("plan_default_groups")
                .insert({
                  plan_id: data.plan_id,
                  group_id: data.id
                });
            }
          }
        } else {
          // Create new - add created_by
          const { data: { user } } = await supabase.auth.getUser();
          const newData = { ...updateData, created_by: user?.id };
          
          const { data: insertedData, error } = await supabase
            .from(table as any)
            .insert(newData)
            .select()
            .single();

          if (error) throw error;
          
          // Add plan link for new groups
          if (type === "group" && data.plan_id && insertedData && 'id' in insertedData) {
            await supabase
              .from("plan_default_groups")
              .insert({
                plan_id: data.plan_id,
                group_id: (insertedData as any).id
              });
          }
        }
      }

      toast.success("Atualizado com sucesso!");
      setEditDialog({ open: false, type: null, data: null });
      await fetchAllData();
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error(error.message || "Erro ao salvar");
    }
  };

  const handleDelete = (type: "profile" | "community" | "group" | "event" | "course" | "course_access", id: string) => {
    setDeleteDialog({ open: true, type, id });
  };

  const confirmDelete = async () => {
    const { type, id } = deleteDialog;
    if (!type || !id) return;

    try {
      let table: string = "";
      switch (type) {
        case "profile":
          table = "profiles";
          break;
        case "community":
          table = "communities";
          break;
        case "group":
          table = "conversation_groups";
          break;
        case "event":
          table = "events";
          break;
      }

      const { error } = await supabase.from(table as any).delete().eq("id", id);

      if (error) throw error;

      toast.success("Deletado com sucesso!");
      setDeleteDialog({ open: false, type: null, id: null });
      await fetchAllData();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error(error.message || "Erro ao deletar");
    }
  };

  const handleLinkUser = async (userId: string, type: "communities" | "groups" | "courses") => {
    try {
      // Fetch current links
      if (type === "communities") {
        const { data } = await supabase
          .from("community_members")
          .select("community_id")
          .eq("user_id", userId);
        setUserLinks(prev => ({ ...prev, communities: data?.map(d => d.community_id) || [] }));
      } else if (type === "groups") {
        const { data } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", userId);
        setUserLinks(prev => ({ ...prev, groups: data?.map(d => d.group_id) || [] }));
      }
      
      setLinkDialog({ open: true, userId, type });
    } catch (error) {
      console.error("Error fetching user links:", error);
      toast.error("Erro ao carregar vínculos");
    }
  };

  const handleToggleLink = async (itemId: string) => {
    const { userId, type } = linkDialog;
    if (!userId || !type) return;

    try {
      const currentLinks = userLinks[type];
      const isLinked = currentLinks.includes(itemId);

      if (type === "communities") {
        if (isLinked) {
          await supabase.from("community_members").delete().eq("user_id", userId).eq("community_id", itemId);
          setUserLinks(prev => ({ ...prev, communities: prev.communities.filter(id => id !== itemId) }));
          toast.success("Usuário removido da comunidade");
        } else {
          await supabase.from("community_members").insert({ user_id: userId, community_id: itemId });
          setUserLinks(prev => ({ ...prev, communities: [...prev.communities, itemId] }));
          toast.success("Usuário adicionado à comunidade");
        }
      } else if (type === "groups") {
        if (isLinked) {
          await supabase.from("group_members").delete().eq("user_id", userId).eq("group_id", itemId);
          setUserLinks(prev => ({ ...prev, groups: prev.groups.filter(id => id !== itemId) }));
          toast.success("Usuário removido do grupo");
        } else {
          await supabase.from("group_members").insert({ user_id: userId, group_id: itemId });
          setUserLinks(prev => ({ ...prev, groups: [...prev.groups, itemId] }));
          toast.success("Usuário adicionado ao grupo");
        }
      }
    } catch (error: any) {
      console.error("Error toggling link:", error);
      toast.error(error.message || "Erro ao atualizar vínculo");
    }
  };

  const handleManageSubscription = async (userId: string, userName: string) => {
    try {
      // Fetch current subscription
      const { data: currentSub } = await supabase
        .from("user_subscriptions")
        .select(`
          *,
          subscription_plans (
            name,
            price
          )
        `)
        .eq("user_id", userId)
        .eq("status", "active")
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscriptionDialog({
        open: true,
        userId,
        userName,
        currentSubscription: currentSub,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      toast.error("Erro ao carregar assinatura");
    }
  };

  const handleUpdateSubscription = async (planId: string, endDate: string) => {
    const { userId } = subscriptionDialog;
    if (!userId) return;

    try {
      // Cancel current subscription
      if (subscriptionDialog.currentSubscription) {
        await supabase
          .from("user_subscriptions")
          .update({ status: "cancelled" })
          .eq("id", subscriptionDialog.currentSubscription.id);
      }

      // Create new subscription
      await supabase.from("user_subscriptions").insert({
        user_id: userId,
        plan_id: planId,
        end_date: endDate,
        status: "active",
      });

      // Add user to default groups
      await addUserToDefaultGroups(userId, planId);

      toast.success("Assinatura atualizada com sucesso!");
      setSubscriptionDialog({ open: false, userId: null, userName: null, currentSubscription: null });
      await fetchAllData();
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      toast.error(error.message || "Erro ao atualizar assinatura");
    }
  };

  const addUserToDefaultGroups = async (userId: string, planId: string) => {
    try {
      const { data: defaultGroups } = await supabase
        .from("plan_default_groups")
        .select("group_id")
        .eq("plan_id", planId);
      
      if (defaultGroups) {
        for (const { group_id } of defaultGroups) {
          // Check if user is already in the group
          const { data: existing } = await supabase
            .from("group_members")
            .select("id")
            .eq("user_id", userId)
            .eq("group_id", group_id)
            .maybeSingle();
          
          if (!existing) {
            await supabase
              .from("group_members")
              .insert({ user_id: userId, group_id: group_id });
          }
        }
      }
    } catch (error) {
      console.error("Error adding user to default groups:", error);
    }
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setPlanDialog({ open: true, mode: "edit", data: plan });
    setSelectedDefaultGroups(plan.default_groups || []);
  };

  const handleCreatePlan = () => {
    setPlanDialog({ 
      open: true, 
      mode: "create", 
      data: { 
        id: "", 
        name: "", 
        price: 0, 
        description: "", 
        billing_frequency: "monthly",
        monthly_corrections_limit: 0,
        monthly_monitorings_limit: 0,
        checkout_url: "",
        default_groups: []
      }
    });
    setSelectedDefaultGroups([]);
  };

  const handleSavePlan = async () => {
    const { data, mode } = planDialog;
    if (!data) return;

    try {
      // Validations
      if (!data.name?.trim()) {
        toast.error("Nome do plano é obrigatório");
        return;
      }
      if (data.price < 0) {
        toast.error("Valor não pode ser negativo");
        return;
      }
      if ((data.monthly_corrections_limit ?? 0) < 0) {
        toast.error("Limite de correções não pode ser negativo");
        return;
      }
      if ((data.monthly_monitorings_limit ?? 0) < 0) {
        toast.error("Limite de monitorias não pode ser negativo");
        return;
      }

      let planId = data.id;

      if (mode === "edit") {
        // Update existing plan
        const { error } = await supabase
          .from("subscription_plans")
          .update({
            name: data.name,
            price: data.price,
            description: data.description,
            billing_frequency: data.billing_frequency,
            monthly_corrections_limit: data.monthly_corrections_limit,
            monthly_monitorings_limit: data.monthly_monitorings_limit,
            checkout_url: data.checkout_url
          })
          .eq("id", data.id);

        if (error) throw error;
      } else {
        // Create new plan
        const { data: newPlan, error } = await supabase
          .from("subscription_plans")
          .insert({
            name: data.name,
            price: data.price,
            description: data.description,
            billing_frequency: data.billing_frequency,
            monthly_corrections_limit: data.monthly_corrections_limit,
            monthly_monitorings_limit: data.monthly_monitorings_limit,
            checkout_url: data.checkout_url
          })
          .select()
          .single();

        if (error) throw error;
        planId = newPlan.id;
      }

      // Update default groups
      // Delete existing links
      await supabase
        .from("plan_default_groups")
        .delete()
        .eq("plan_id", planId);

      // Insert new links
      if (selectedDefaultGroups.length > 0) {
        const links = selectedDefaultGroups.map(group_id => ({
          plan_id: planId,
          group_id
        }));
        
        await supabase
          .from("plan_default_groups")
          .insert(links);
      }

      toast.success(`Plano ${mode === "edit" ? "atualizado" : "criado"} com sucesso!`);
      setPlanDialog({ open: false, mode: "create", data: null });
      setSelectedDefaultGroups([]);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error saving plan:", error);
      toast.error(error.message || "Erro ao salvar plano");
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      // Check if there are active subscriptions
      const { data: activeSubs, error: checkError } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("plan_id", planId)
        .eq("status", "active")
        .limit(1);

      if (checkError) throw checkError;

      if (activeSubs && activeSubs.length > 0) {
        toast.error("Não é possível deletar um plano com assinaturas ativas");
        return;
      }

      // Delete the plan (cascade will delete plan_default_groups)
      const { error } = await supabase
        .from("subscription_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;

      toast.success("Plano deletado com sucesso!");
      await fetchAllData();
    } catch (error: any) {
      console.error("Error deleting plan:", error);
      toast.error(error.message || "Erro ao deletar plano");
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedDefaultGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === filteredProfiles.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredProfiles.map(p => p.id));
    }
  };

  const handleBulkEdit = () => {
    if (selectedUsers.length === 0) {
      toast.error("Selecione pelo menos um usuário");
      return;
    }
    setBulkEditDialog({ open: true, data: {} });
  };

  const handleSaveBulkEdit = async () => {
    const { data } = bulkEditDialog;
    if (selectedUsers.length === 0) return;

    try {
      // Update role for selected users
      if (data.role) {
        for (const userId of selectedUsers) {
          await supabase.from("user_roles").delete().eq("user_id", userId);
          await supabase.from("user_roles").insert([{ user_id: userId, role: data.role as any }]);
        }
      }

      // Update subscription plan and due day
      if (data.planId) {
        for (const userId of selectedUsers) {
          const { data: existingSub } = await supabase
            .from("user_subscriptions")
            .select("id")
            .eq("user_id", userId)
            .eq("status", "active")
            .maybeSingle();

          const updateData: any = { plan_id: data.planId };
          if (data.dueDay) {
            updateData.due_day = data.dueDay;
          }

          if (existingSub) {
            await supabase
              .from("user_subscriptions")
              .update(updateData)
              .eq("id", existingSub.id);
          } else {
            await supabase
              .from("user_subscriptions")
              .insert({
                user_id: userId,
                plan_id: data.planId,
                due_day: data.dueDay || 1,
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                status: "active"
              });
          }
        }
      } else if (data.dueDay && !data.planId) {
        // Update only due day if no plan selected
        for (const userId of selectedUsers) {
          const { data: existingSub } = await supabase
            .from("user_subscriptions")
            .select("id")
            .eq("user_id", userId)
            .eq("status", "active")
            .maybeSingle();

          if (existingSub) {
            await supabase
              .from("user_subscriptions")
              .update({ due_day: data.dueDay })
              .eq("id", existingSub.id);
          }
        }
      }

      // Add users to selected groups
      if (data.groupIds && data.groupIds.length > 0) {
        for (const userId of selectedUsers) {
          for (const groupId of data.groupIds) {
            await supabase
              .from("group_members")
              .upsert({ user_id: userId, group_id: groupId }, { onConflict: "user_id,group_id" });
          }
        }
      }

      toast.success(`${selectedUsers.length} usuário(s) atualizado(s) com sucesso!`);
      setBulkEditDialog({ open: false, data: {} });
      setSelectedUsers([]);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error in bulk edit:", error);
      toast.error(error.message || "Erro ao atualizar usuários");
    }
  };

  // Filter data based on search
  const filteredProfiles = profiles.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredCommunities = communities.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const parseCSV = (csv: string): string[][] => {
    const lines = csv.trim().split('\n');
    return lines.map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    });
  };

  const handleImportUsers = async () => {
    if (!usersCSV.trim()) {
      toast.error("Por favor, cole o conteúdo do CSV de usuários");
      return;
    }

    setImportLoading(true);
    try {
      const rows = parseCSV(usersCSV);
      const headers = rows[0].map(h => h.toLowerCase());
      
      // Validate headers
      const requiredHeaders = ['name', 'email', 'role'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(', ')}`);
        setImportLoading(false);
        return;
      }

      let imported = 0;
      let errors = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2 || !row[0]) continue; // Skip empty rows

        const userData: any = {};
        headers.forEach((header, index) => {
          userData[header] = row[index] || null;
        });

        try {
          // Create auth user
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: Math.random().toString(36).slice(-8) + 'A1!', // Random password
            email_confirm: true,
            user_metadata: {
              name: userData.name
            }
          });

          if (authError) throw authError;

          // Profile is created automatically via trigger
          // Update additional profile fields
          if (authData.user) {
            await supabase
              .from("profiles")
              .update({
                phone: userData.phone || null,
                city: userData.city || null,
                bio: userData.bio || null
              })
              .eq("id", authData.user.id);

            // Add role
            const role = userData.role?.toLowerCase() || 'student';
            if (['admin', 'teacher', 'student'].includes(role)) {
              await supabase
                .from("user_roles")
                .delete()
                .eq("user_id", authData.user.id);
                
              await supabase
                .from("user_roles")
                .insert({ user_id: authData.user.id, role });
            }
          }

          imported++;
        } catch (error: any) {
          console.error(`Erro ao importar linha ${i + 1}:`, error);
          errors++;
        }
      }

      toast.success(`${imported} usuários importados com sucesso!${errors > 0 ? ` ${errors} erros.` : ''}`);
      setUsersCSV("");
      await fetchAllData();
    } catch (error: any) {
      console.error("Error importing users:", error);
      toast.error(error.message || "Erro ao importar usuários");
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportLessons = async () => {
    if (!lessonsCSV.trim()) {
      toast.error("Por favor, cole o conteúdo do CSV de aulas");
      return;
    }

    setImportLoading(true);
    try {
      const rows = parseCSV(lessonsCSV);
      const headers = rows[0].map(h => h.toLowerCase());
      
      // Validate headers
      const requiredHeaders = ['name', 'module_id', 'youtube_url'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(', ')}`);
        setImportLoading(false);
        return;
      }

      let imported = 0;
      let errors = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2 || !row[0]) continue; // Skip empty rows

        const lessonData: any = {};
        headers.forEach((header, index) => {
          lessonData[header] = row[index] || null;
        });

        try {
          const { error } = await supabase
            .from("course_lessons")
            .insert({
              name: lessonData.name,
              description: lessonData.description || null,
              youtube_url: lessonData.youtube_url,
              module_id: lessonData.module_id,
              duration_minutes: lessonData.duration_minutes ? parseInt(lessonData.duration_minutes) : null,
              order_index: lessonData.order_index ? parseInt(lessonData.order_index) : 0
            });

          if (error) throw error;
          imported++;
        } catch (error: any) {
          console.error(`Erro ao importar linha ${i + 1}:`, error);
          errors++;
        }
      }

      toast.success(`${imported} aulas importadas com sucesso!${errors > 0 ? ` ${errors} erros.` : ''}`);
      setLessonsCSV("");
    } catch (error: any) {
      console.error("Error importing lessons:", error);
      toast.error(error.message || "Erro ao importar aulas");
    } finally {
      setImportLoading(false);
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ferramentas de Desenvolvimento</h1>
          <p className="text-muted-foreground">Visualize e edite dados do sistema</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/communities")}>
          Voltar
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comunidades</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{communities.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} className="space-y-4" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="communities">Comunidades</TabsTrigger>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="import">Importação CSV</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usuários</CardTitle>
                  <CardDescription>Visualize e edite perfis de usuários</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedUsers.length > 0 && (
                    <Button onClick={handleBulkEdit} variant="default">
                      Editar {selectedUsers.length} selecionado(s)
                    </Button>
                  )}
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuários..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.length === filteredProfiles.length && filteredProfiles.length > 0}
                        onCheckedChange={toggleAllUsers}
                      />
                    </TableHead>
                    <TableHead>Avatar</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="w-[200px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.includes(profile.id)}
                            onCheckedChange={() => toggleUserSelection(profile.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={profile.avatar_url || ""} alt={profile.name} />
                            <AvatarFallback>{profile.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{profile.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{profile.email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={
                            profile.role === "admin" ? "default" : 
                            profile.role === "teacher" ? "secondary" : 
                            profile.role === "visitor" ? "outline" :
                            "outline"
                          }>
                            {profile.role === "admin" && "Admin"}
                            {profile.role === "teacher" && "Professor"}
                            {profile.role === "student" && "Aluno"}
                            {profile.role === "visitor" && "Visitante"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {profile.subscription ? (
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{profile.subscription.plan_name}</p>
                              <p className="text-xs text-muted-foreground">
                                R$ {profile.subscription.price.toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sem plano</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {profile.subscription ? (
                            <Badge variant={
                              new Date(profile.subscription.end_date) > new Date() ? "default" : "destructive"
                            }>
                              {new Date(profile.subscription.end_date).toLocaleDateString("pt-BR")}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit("profile", profile)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleLinkUser(profile.id, "communities")}
                              title="Vincular Comunidades"
                            >
                              <FolderOpen className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleLinkUser(profile.id, "groups")}
                              title="Vincular Grupos"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete("profile", profile.id)}
                              title="Deletar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communities" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Comunidades</CardTitle>
                  <CardDescription>Visualize e edite comunidades</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar comunidades..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Matéria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommunities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhuma comunidade encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCommunities.map((community) => (
                      <TableRow key={community.id}>
                        <TableCell className="font-medium">{community.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{community.subject}</Badge>
                        </TableCell>
                        <TableCell>{community.description || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit("community", community)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete("community", community.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Grupos</CardTitle>
                  <CardDescription>Visualize e edite grupos de conversa</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => {
                      setEditDialog({ 
                        open: true, 
                        type: "group", 
                        data: {
                          name: "",
                          description: "",
                          community_id: "",
                          students_can_message: true,
                          is_visible: true
                        }
                      });
                    }}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Grupo
                  </Button>
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar grupos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Comunidade</TableHead>
                    <TableHead>Membros</TableHead>
                    <TableHead>Online (2h)</TableHead>
                    <TableHead>Msg/Hora</TableHead>
                    <TableHead>Pode Enviar</TableHead>
                    <TableHead>Visível</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Nenhum grupo encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGroups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{group.community_name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{group.member_count || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={group.online_count && group.online_count > 0 ? "default" : "outline"}>
                            {group.online_count || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {group.messages_per_hour?.toFixed(1) || "0.0"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={group.students_can_message ? "default" : "outline"}>
                            {group.students_can_message ? "Sim" : "Não"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={group.is_visible ? "default" : "outline"}>
                            {group.is_visible ? "Sim" : "Não"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit("group", group)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete("group", group.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <DevToolsCoursesTab
            courses={courses}
            courseAccess={courseAccess}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onManageAccess={(userId, userName) => setCourseAccessDialog({ open: true, userId, userName })}
          />
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Eventos</CardTitle>
                  <CardDescription>Visualize e edite eventos</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-64">
                    <Select
                      value={selectedCommunityForEvent}
                      onValueChange={setSelectedCommunityForEvent}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma comunidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {communities.map((community) => (
                          <SelectItem key={community.id} value={community.id}>
                            {community.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      if (!selectedCommunityForEvent) {
                        toast.error("Selecione uma comunidade primeiro");
                        return;
                      }
                      setCreateEventOpen(true);
                    }}
                    size="sm"
                  >
                    Adicionar Evento
                  </Button>
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar eventos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum evento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>
                          {new Date(event.event_date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.duration_minutes} min</Badge>
                        </TableCell>
                        <TableCell>{event.description || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit("event", event)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete("event", event.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Planos de Assinatura</CardTitle>
                  <CardDescription>Gerencie planos, valores e configurações</CardDescription>
                </div>
                <Button onClick={handleCreatePlan}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Novo Plano
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Cobrança</TableHead>
                    <TableHead>Monitorias</TableHead>
                    <TableHead>Correções/Semana</TableHead>
                    <TableHead>Grupos Padrão</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionPlans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Nenhum plano cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptionPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{plan.name}</p>
                            {plan.description && (
                              <p className="text-sm text-muted-foreground">{plan.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            R$ {plan.price.toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {plan.billing_frequency === "monthly" && "Mensal"}
                            {plan.billing_frequency === "quarterly" && "Trimestral"}
                            {plan.billing_frequency === "semiannual" && "Semestral"}
                            {plan.billing_frequency === "annual" && "Anual"}
                            {!plan.billing_frequency && "Mensal"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {plan.monthly_monitorings_limit || 0} monitorias/mês
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {plan.monthly_corrections_limit || 0} correções/mês
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {plan.default_groups?.length || 0} grupos
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditPlan(plan)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePlan(plan.id)}
                              title="Deletar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Importar Usuários
                </CardTitle>
                <CardDescription>
                  Cole o conteúdo do CSV com os usuários. Formato: name,email,role,phone,city
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="usersCSV">Conteúdo do CSV</Label>
                  <Textarea
                    id="usersCSV"
                    value={usersCSV}
                    onChange={(e) => setUsersCSV(e.target.value)}
                    placeholder="name,email,role,phone,city&#10;João Silva,joao@example.com,student,11999999999,São Paulo&#10;Maria Santos,maria@example.com,teacher,11888888888,Rio de Janeiro"
                    className="font-mono text-sm min-h-[200px]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-semibold mb-1">Campos obrigatórios:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">name</code> - Nome do usuário</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">email</code> - Email (único)</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">role</code> - Tipo: student, teacher ou admin</li>
                    </ul>
                    <p className="font-semibold mt-2 mb-1">Campos opcionais:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">phone</code> - Telefone</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">city</code> - Cidade</li>
                    </ul>
                  </div>
                </div>
                <Button 
                  onClick={handleImportUsers} 
                  disabled={importLoading || !usersCSV.trim()}
                  className="w-full"
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Importar Usuários
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Importar Aulas
                </CardTitle>
                <CardDescription>
                  Cole o conteúdo do CSV com as aulas. Formato: name,module_id,youtube_url,description,duration_minutes,order_index
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="lessonsCSV">Conteúdo do CSV</Label>
                  <Textarea
                    id="lessonsCSV"
                    value={lessonsCSV}
                    onChange={(e) => setLessonsCSV(e.target.value)}
                    placeholder="name,module_id,youtube_url,description,duration_minutes,order_index&#10;Aula 1,uuid-do-modulo,https://youtube.com/watch?v=abc,Introdução,45,1&#10;Aula 2,uuid-do-modulo,https://youtube.com/watch?v=def,Conceitos,60,2"
                    className="font-mono text-sm min-h-[200px]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-semibold mb-1">Campos obrigatórios:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">name</code> - Nome da aula</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">module_id</code> - UUID do módulo</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">youtube_url</code> - URL do vídeo</li>
                    </ul>
                    <p className="font-semibold mt-2 mb-1">Campos opcionais:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">description</code> - Descrição</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">duration_minutes</code> - Duração em minutos</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">order_index</code> - Ordem (padrão: 0)</li>
                    </ul>
                  </div>
                </div>
                <Button 
                  onClick={handleImportLessons} 
                  disabled={importLoading || !lessonsCSV.trim()}
                  className="w-full"
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Importar Aulas
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, type: null, data: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editDialog.data?.id 
                ? `Editar ${
                    editDialog.type === "profile" ? "Usuário" : 
                    editDialog.type === "community" ? "Comunidade" : 
                    editDialog.type === "group" ? "Grupo" : 
                    "Evento"
                  }`
                : "Criar Novo"
              }
            </DialogTitle>
            <DialogDescription>Faça as alterações necessárias</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {editDialog.type === "profile" && editDialog.data && (
              <>
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={editDialog.data.name || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), name: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editDialog.data.email || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), email: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Tipo de Usuário</Label>
                  <Select
                    value={editDialog.data.role || "student"}
                    onValueChange={(value) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), role: value } }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Aluno</SelectItem>
                      <SelectItem value="teacher">Professor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="visitor">Visitante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={editDialog.data.phone || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), phone: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={editDialog.data.city || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), city: e.target.value } }))}
                  />
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold mb-3">Configurações de Plano</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="plan">Plano</Label>
                      <Select
                        value={editDialog.data.planId || ""}
                        onValueChange={(value) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), planId: value } }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {subscriptionPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - R$ {plan.price.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="customPrice">Valor Customizado (R$)</Label>
                      <Input
                        id="customPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editDialog.data.customPrice || 0}
                        onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), customPrice: parseFloat(e.target.value) || 0 } }))}
                        placeholder="Deixe 0 para usar o valor do plano"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dueDay">Dia de Vencimento (1-31)</Label>
                      <Input
                        id="dueDay"
                        type="number"
                        min="1"
                        max="31"
                        value={editDialog.data.dueDay || 1}
                        onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), dueDay: parseInt(e.target.value) || 1 } }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold mb-3">Configurações de Monitoria</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="monitoringDay">Dia da Semana</Label>
                      <Select
                        value={editDialog.data.monitoringDayOfWeek?.toString() || ""}
                        onValueChange={(value) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), monitoringDayOfWeek: parseInt(value) } }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o dia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Domingo</SelectItem>
                          <SelectItem value="1">Segunda</SelectItem>
                          <SelectItem value="2">Terça</SelectItem>
                          <SelectItem value="3">Quarta</SelectItem>
                          <SelectItem value="4">Quinta</SelectItem>
                          <SelectItem value="5">Sexta</SelectItem>
                          <SelectItem value="6">Sábado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="monitoringTime">Hora</Label>
                      <Input
                        id="monitoringTime"
                        type="time"
                        value={editDialog.data.monitoringTime || ""}
                        onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), monitoringTime: e.target.value } }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold mb-3">Limite de Envios</h4>
                  <div>
                    <Label htmlFor="weeklySubmissionsLimit">Tarefas por Semana</Label>
                    <Input
                      id="weeklySubmissionsLimit"
                      type="number"
                      min="0"
                      value={editDialog.data.weeklySubmissionsLimit || 0}
                      onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), weeklySubmissionsLimit: parseInt(e.target.value) || 0 } }))}
                    />
                  </div>
                </div>
              </>
            )}

            {editDialog.type === "community" && editDialog.data && (
              <>
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={editDialog.data.name || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), name: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Matéria</Label>
                  <Input
                    id="subject"
                    value={editDialog.data.subject || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), subject: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={editDialog.data.description || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), description: e.target.value } }))}
                  />
                </div>
              </>
            )}

            {editDialog.type === "group" && editDialog.data && (
              <>
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={editDialog.data.name || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), name: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={editDialog.data.description || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), description: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="community">Comunidade</Label>
                  <Select
                    value={editDialog.data.community_id || ""}
                    onValueChange={(value) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), community_id: value } }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a comunidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {communities.map((community) => (
                        <SelectItem key={community.id} value={community.id}>
                          {community.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="plan">Plano Requerido (opcional)</Label>
                  <Select
                    value={editDialog.data.plan_id || "none"}
                    onValueChange={(value) => setEditDialog(prev => ({ 
                      ...prev, 
                      data: { 
                        ...(prev.data || {}), 
                        plan_id: value === "none" ? undefined : value 
                      } 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum plano específico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum plano específico</SelectItem>
                      {subscriptionPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - R$ {plan.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="students_can_message"
                    checked={editDialog.data.students_can_message ?? true}
                    onCheckedChange={(checked) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), students_can_message: checked } }))}
                  />
                  <Label htmlFor="students_can_message" className="cursor-pointer">
                    Alunos podem enviar mensagens
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_visible"
                    checked={editDialog.data.is_visible ?? true}
                    onCheckedChange={(checked) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), is_visible: checked } }))}
                  />
                  <Label htmlFor="is_visible" className="cursor-pointer">
                    Grupo visível
                  </Label>
                </div>
              </>
            )}

            {editDialog.type === "event" && editDialog.data && (
              <>
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={editDialog.data.title || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), title: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={editDialog.data.description || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), description: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="duration_minutes">Duração (minutos)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={editDialog.data.duration_minutes || 60}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), duration_minutes: parseInt(e.target.value) } }))}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, type: null, data: null })}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialog.open} onOpenChange={(open) => !open && setLinkDialog({ open: false, userId: null, type: null })}>
        <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Vincular {linkDialog.type === "communities" ? "Comunidades" : linkDialog.type === "groups" ? "Grupos" : "Cursos"}
            </DialogTitle>
            <DialogDescription>
              Selecione os itens para vincular ou desvincular o usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {linkDialog.type === "communities" && communities.map((community) => (
              <div key={community.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{community.name}</p>
                  <p className="text-sm text-muted-foreground">{community.subject}</p>
                </div>
                <Button
                  size="sm"
                  variant={userLinks.communities.includes(community.id) ? "default" : "outline"}
                  onClick={() => handleToggleLink(community.id)}
                >
                  {userLinks.communities.includes(community.id) ? "Remover" : "Adicionar"}
                </Button>
              </div>
            ))}
            {linkDialog.type === "groups" && groups.map((group) => (
              <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{group.name}</p>
                  <p className="text-sm text-muted-foreground">{group.community_name}</p>
                </div>
                <Button
                  size="sm"
                  variant={userLinks.groups.includes(group.id) ? "default" : "outline"}
                  onClick={() => handleToggleLink(group.id)}
                >
                  {userLinks.groups.includes(group.id) ? "Remover" : "Adicionar"}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={subscriptionDialog.open} onOpenChange={(open) => !open && setSubscriptionDialog({ open: false, userId: null, userName: null, currentSubscription: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Assinatura</DialogTitle>
            <DialogDescription>
              Assinatura de {subscriptionDialog.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {subscriptionDialog.currentSubscription && (
              <div className="p-3 border rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Assinatura Atual</p>
                <p className="text-sm text-muted-foreground">
                  {(subscriptionDialog.currentSubscription.subscription_plans as any)?.name} - R$ {(subscriptionDialog.currentSubscription.subscription_plans as any)?.price}
                </p>
                <p className="text-sm text-muted-foreground">
                  Vence em: {new Date(subscriptionDialog.currentSubscription.end_date).toLocaleDateString("pt-BR")}
                </p>
              </div>
            )}
            <div>
              <Label>Novo Plano</Label>
              <Select
                onValueChange={(planId) => {
                  const endDate = new Date();
                  endDate.setMonth(endDate.getMonth() + 1);
                  handleUpdateSubscription(planId, endDate.toISOString());
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - R$ {plan.price.toFixed(2)}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={planDialog.open} onOpenChange={(open) => !open && setPlanDialog({ open: false, mode: "create", data: null })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {planDialog.mode === "edit" ? "Editar Plano" : "Criar Novo Plano"}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do plano de assinatura
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="plan-name">Nome do Plano *</Label>
              <Input
                id="plan-name"
                value={planDialog.data?.name || ""}
                onChange={(e) => setPlanDialog(prev => ({ 
                  ...prev, 
                  data: { ...(prev.data || {} as SubscriptionPlan), name: e.target.value } 
                }))}
                placeholder="Ex: Plano Premium"
              />
            </div>

            <div>
              <Label htmlFor="plan-description">Descrição</Label>
              <Textarea
                id="plan-description"
                value={planDialog.data?.description || ""}
                onChange={(e) => setPlanDialog(prev => ({ 
                  ...prev, 
                  data: { ...(prev.data || {} as SubscriptionPlan), description: e.target.value } 
                }))}
                placeholder="Descrição do plano"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="plan-price">Valor Mensal (R$) *</Label>
              <Input
                id="plan-price"
                type="number"
                step="0.01"
                min="0"
                value={planDialog.data?.price || 0}
                onChange={(e) => setPlanDialog(prev => ({ 
                  ...prev, 
                  data: { ...(prev.data || {} as SubscriptionPlan), price: parseFloat(e.target.value) || 0 } 
                }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="billing-frequency">Frequência de Cobrança *</Label>
              <Select
                value={planDialog.data?.billing_frequency || "monthly"}
                onValueChange={(value) => setPlanDialog(prev => ({ 
                  ...prev, 
                  data: { ...(prev.data || {} as SubscriptionPlan), billing_frequency: value } 
                }))}
              >
                <SelectTrigger id="billing-frequency">
                  <SelectValue placeholder="Selecione a frequência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semiannual">Semestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="monitorings-limit">Monitorias por Mês *</Label>
              <Input
                id="monitorings-limit"
                type="number"
                min="0"
                value={planDialog.data?.monthly_monitorings_limit || 0}
                onChange={(e) => setPlanDialog(prev => ({ 
                  ...prev, 
                  data: { ...(prev.data || {} as SubscriptionPlan), monthly_monitorings_limit: parseInt(e.target.value) || 0 } 
                }))}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="corrections-limit">Correções por Mês *</Label>
              <Input
                id="corrections-limit"
                type="number"
                min="0"
                value={planDialog.data?.monthly_corrections_limit || 0}
                onChange={(e) => setPlanDialog(prev => ({ 
                  ...prev, 
                  data: { ...(prev.data || {} as SubscriptionPlan), monthly_corrections_limit: parseInt(e.target.value) || 0 } 
                }))}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="checkout-url">Link de Checkout</Label>
              <Input
                id="checkout-url"
                type="url"
                value={planDialog.data?.checkout_url || ""}
                onChange={(e) => setPlanDialog(prev => ({ 
                  ...prev, 
                  data: { ...(prev.data || {} as SubscriptionPlan), checkout_url: e.target.value } 
                }))}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label className="mb-2 block">Grupos Padrão</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Alunos com este plano serão automaticamente adicionados aos grupos selecionados
              </p>
              <div className="border rounded-md p-4 space-y-2 max-h-[200px] overflow-y-auto">
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum grupo disponível
                  </p>
                ) : (
                  groups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={selectedDefaultGroups.includes(group.id)}
                        onCheckedChange={() => toggleGroupSelection(group.id)}
                      />
                      <label
                        htmlFor={`group-${group.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {group.name}
                        {group.community_name && (
                          <span className="text-muted-foreground ml-2">
                            ({group.community_name})
                          </span>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedDefaultGroups.length} grupo(s) selecionado(s)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setPlanDialog({ open: false, mode: "create", data: null })}
            >
              Cancelar
            </Button>
            <Button onClick={handleSavePlan}>
              <DollarSign className="h-4 w-4 mr-2" />
              {planDialog.mode === "edit" ? "Salvar Alterações" : "Criar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: null, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente este{" "}
              {deleteDialog.type === "profile" ? "usuário" :
               deleteDialog.type === "community" ? "comunidade" :
               deleteDialog.type === "group" ? "grupo" : 
               "evento"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditDialog.open} onOpenChange={(open) => !open && setBulkEditDialog({ open: false, data: {} })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar {selectedUsers.length} Usuário(s)</DialogTitle>
            <DialogDescription>
              Modificações serão aplicadas a todos os usuários selecionados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-role">Tipo de Usuário</Label>
              <Select 
                value={bulkEditDialog.data.role || ""} 
                onValueChange={(value) => setBulkEditDialog(prev => ({ 
                  ...prev, 
                  data: { ...prev.data, role: value } 
                }))}
              >
                <SelectTrigger id="bulk-role">
                  <SelectValue placeholder="Selecione um tipo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Professor</SelectItem>
                  <SelectItem value="student">Aluno</SelectItem>
                  <SelectItem value="visitor">Visitante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bulk-plan">Plano</Label>
              <Select 
                value={bulkEditDialog.data.planId || ""} 
                onValueChange={(value) => setBulkEditDialog(prev => ({ 
                  ...prev, 
                  data: { ...prev.data, planId: value } 
                }))}
              >
                <SelectTrigger id="bulk-plan">
                  <SelectValue placeholder="Selecione um plano (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - R$ {plan.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bulk-due-day">Dia de Vencimento (1-30)</Label>
              <Input
                id="bulk-due-day"
                type="number"
                min="1"
                max="30"
                placeholder="Ex: 5 para dia 5 de cada mês"
                value={bulkEditDialog.data.dueDay || ""}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= 30) {
                    setBulkEditDialog(prev => ({ 
                      ...prev, 
                      data: { ...prev.data, dueDay: value } 
                    }));
                  } else if (e.target.value === "") {
                    setBulkEditDialog(prev => ({ 
                      ...prev, 
                      data: { ...prev.data, dueDay: undefined } 
                    }));
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Dia do mês em que o pagamento vence (ex: 5 = dia 5 de cada mês)
              </p>
            </div>

            <div>
              <Label className="mb-2 block">Liberar Grupos</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Adicionar usuários aos grupos selecionados
              </p>
              <div className="border rounded-md p-4 space-y-2 max-h-[200px] overflow-y-auto">
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum grupo disponível
                  </p>
                ) : (
                  groups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bulk-group-${group.id}`}
                        checked={bulkEditDialog.data.groupIds?.includes(group.id) || false}
                        onCheckedChange={(checked) => {
                          setBulkEditDialog(prev => {
                            const currentGroups = prev.data.groupIds || [];
                            return {
                              ...prev,
                              data: {
                                ...prev.data,
                                groupIds: checked 
                                  ? [...currentGroups, group.id]
                                  : currentGroups.filter(id => id !== group.id)
                              }
                            };
                          });
                        }}
                      />
                      <label
                        htmlFor={`bulk-group-${group.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {group.name}
                        {group.community_name && (
                          <span className="text-muted-foreground ml-2">
                            ({group.community_name})
                          </span>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {bulkEditDialog.data.groupIds?.length || 0} grupo(s) selecionado(s)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setBulkEditDialog({ open: false, data: {} })}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveBulkEdit}>
              Aplicar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateEventDialog
        open={createEventOpen}
        onOpenChange={setCreateEventOpen}
        communityId={selectedCommunityForEvent}
        userId=""
        isAdmin={true}
        onSuccess={() => {
          fetchAllData();
          toast.success("Evento criado com sucesso!");
        }}
      />
    </div>
  );
}
