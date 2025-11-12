import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Users, Mail, Phone, BookOpen, GraduationCap, Edit, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";
import { z } from "zod";
import { SubmitTaskDialog } from "@/components/SubmitTaskDialog";
import { SubmissionCard } from "@/components/SubmissionCard";
import { ReviewSubmissionDialog } from "@/components/ReviewSubmissionDialog";
import { ViewSubmissionDialog } from "@/components/ViewSubmissionDialog";
const groupSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  description: z.string().trim().max(500, "Descrição muito longa").optional(),
  is_visible: z.boolean().default(true),
  students_can_message: z.boolean().default(true)
});
const inviteSchema = z.object({
  contact: z.string().trim().min(3, "Email ou telefone inválido")
});
type Community = {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  created_by: string;
};
type Group = {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  last_message?: string | null;
  last_message_time?: string | null;
  last_message_sender?: string | null;
};
type Course = {
  id: string;
  name: string;
  description: string | null;
  lesson_count?: number;
};
type Event = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  duration_minutes: number;
  group_names: string[];
  participant_count: number;
};
type Submission = {
  id: string;
  task_name: string;
  video_url: string;
  recording_date: string;
  extra_notes?: string;
  status: "pending" | "reviewed";
  teacher_comments?: string;
  grade?: number;
  student_id: string;
  community_id: string;
  created_at: string;
  reviewed_by?: string;
};
type SubmissionWithProfile = Submission & {
  student_name: string;
  student_avatar?: string;
  teacher_name?: string;
  teacher_avatar?: string;
};
const CommunityManagement = () => {
  const navigate = useNavigate();
  const {
    communityId
  } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState<SubmissionWithProfile[]>([]);
  const [mySubmissions, setMySubmissions] = useState<SubmissionWithProfile[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithProfile | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    is_visible: true,
    students_can_message: true
  });
  const [inviteForm, setInviteForm] = useState({
    contact: ""
  });
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (!currentSession?.user) {
        navigate("/auth");
      }
    });
    supabase.auth.getSession().then(({
      data: {
        session: currentSession
      }
    }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (!currentSession?.user) {
        navigate("/auth");
      } else if (communityId) {
        fetchCommunityData(communityId, currentSession.user.id);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate, communityId]);
  const fetchCommunityData = async (commId: string, userId: string) => {
    try {
      // Fetch community
      const {
        data: commData,
        error: commError
      } = await supabase.from("communities").select("*").eq("id", commId).single();
      if (commError) throw commError;

      // Removed creator check - all users can access this page
      setCommunity(commData);

      // Check if user is teacher
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["teacher", "admin"]);
      
      const isTeacherOrAdmin = roleData && roleData.length > 0;
      setIsTeacher(isTeacherOrAdmin);

      // Fetch groups, courses and events
      await fetchGroups(commId);
      await fetchCourses(commId);
      await fetchEvents(commId);
      await fetchSubmissions(commId, userId, isTeacherOrAdmin);
    } catch (error: any) {
      console.error("Error fetching community:", error);
      toast.error("Erro ao carregar comunidade");
      navigate("/communities");
    }
  };
  const fetchGroups = async (commId: string) => {
    try {
      const {
        data: groupsData,
        error: groupsError
      } = await supabase.from("conversation_groups").select("*").eq("community_id", commId).order("created_at", {
        ascending: false
      });
      if (groupsError) throw groupsError;
      const groupsWithCounts = await Promise.all((groupsData || []).map(async (group: any) => {
        const {
          count
        } = await supabase.from("group_members").select("*", {
          count: "exact",
          head: true
        }).eq("group_id", group.id);

        // Fetch last message
        const {
          data: lastMessageData
        } = await supabase.from("messages").select("content, created_at, user_id").eq("group_id", group.id).order("created_at", {
          ascending: false
        }).limit(1).single();

        // Fetch sender profile if message exists
        let senderName = null;
        if (lastMessageData?.user_id) {
          const {
            data: profileData
          } = await supabase.from("profiles").select("name").eq("id", lastMessageData.user_id).single();
          senderName = profileData?.name || null;
        }
        return {
          id: group.id,
          name: group.name,
          description: group.description,
          member_count: count || 0,
          last_message: lastMessageData?.content || null,
          last_message_time: lastMessageData?.created_at || null,
          last_message_sender: senderName
        };
      }));
      setGroups(groupsWithCounts);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
    }
  };
  const fetchCourses = async (commId: string) => {
    try {
      const {
        data: coursesData,
        error: coursesError
      } = await supabase.from("courses").select("*").eq("community_id", commId).order("created_at", {
        ascending: false
      });
      if (coursesError) throw coursesError;
      const coursesWithCounts = await Promise.all((coursesData || []).map(async (course: any) => {
        // Count total lessons across all modules
        const {
          data: modulesData
        } = await supabase.from("course_modules").select("id").eq("course_id", course.id);
        const moduleIds = (modulesData || []).map(m => m.id);
        let lessonCount = 0;
        if (moduleIds.length > 0) {
          const {
            count
          } = await supabase.from("course_lessons").select("*", {
            count: "exact",
            head: true
          }).in("module_id", moduleIds);
          lessonCount = count || 0;
        }
        return {
          id: course.id,
          name: course.name,
          description: course.description,
          lesson_count: lessonCount
        };
      }));
      setCourses(coursesWithCounts);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
    }
  };
  const fetchEvents = async (commId: string) => {
    try {
      const {
        data: eventsData,
        error
      } = await supabase.from('events').select(`
          id,
          title,
          description,
          event_date,
          duration_minutes,
          event_groups(
            conversation_groups(name)
          )
        `).eq('community_id', commId).gte('event_date', new Date().toISOString()).order('event_date', {
        ascending: true
      }).limit(5);
      if (error) throw error;
      const eventsWithCounts = await Promise.all((eventsData || []).map(async (event: any) => {
        const {
          count
        } = await supabase.from('event_participants').select('*', {
          count: 'exact',
          head: true
        }).eq('event_id', event.id);
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          event_date: event.event_date,
          duration_minutes: event.duration_minutes,
          group_names: event.event_groups?.map((eg: any) => eg.conversation_groups?.name).filter(Boolean) || [],
          participant_count: count || 0
        };
      }));
      setEvents(eventsWithCounts);
    } catch (error: any) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchSubmissions = async (commId: string, userId: string, isTeacherOrAdmin: boolean) => {
    try {
      if (isTeacherOrAdmin) {
        // Fetch pending submissions for teachers
        const { data: submissionsData, error } = await supabase
          .from("submissions")
          .select("*")
          .eq("community_id", commId)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const submissionsWithProfiles = await Promise.all(
          (submissionsData || []).map(async (submission: any) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("name, avatar_url")
              .eq("id", submission.student_id)
              .single();

            return {
              ...submission,
              student_name: profile?.name || "Aluno",
              student_avatar: profile?.avatar_url,
            };
          })
        );

        setPendingSubmissions(submissionsWithProfiles);
      } else {
        // Fetch student's own submissions
        const { data: submissionsData, error } = await supabase
          .from("submissions")
          .select("*")
          .eq("community_id", commId)
          .eq("student_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const submissionsWithProfiles = await Promise.all(
          (submissionsData || []).map(async (submission: any) => {
            let teacherName, teacherAvatar;
            if (submission.reviewed_by) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("name, avatar_url")
                .eq("id", submission.reviewed_by)
                .single();
              
              teacherName = profile?.name;
              teacherAvatar = profile?.avatar_url;
            }

            return {
              ...submission,
              student_name: "", // Not needed for own submissions
              teacher_name: teacherName,
              teacher_avatar: teacherAvatar,
            };
          })
        );

        setMySubmissions(submissionsWithProfiles);
      }
    } catch (error: any) {
      console.error("Error fetching submissions:", error);
    }
  };

  const handleReviewComplete = () => {
    if (communityId && user) {
      fetchSubmissions(communityId, user.id, isTeacher);
    }
  };
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = groupSchema.parse(groupForm);
      setCreating(true);
      const {
        error
      } = await supabase.from("conversation_groups").insert({
        community_id: communityId,
        name: validated.name,
        description: validated.description || null,
        created_by: user?.id,
        is_visible: validated.is_visible,
        students_can_message: validated.students_can_message
      });
      if (error) throw error;
      toast.success("Grupo criado com sucesso!");
      setGroupForm({
        name: "",
        description: "",
        is_visible: true,
        students_can_message: true
      });
      setCreateGroupOpen(false);
      if (communityId) fetchGroups(communityId);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Erro de validação");
      } else {
        toast.error("Erro ao criar grupo: " + error.message);
      }
    } finally {
      setCreating(false);
    }
  };
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = inviteSchema.parse(inviteForm);
      setInviting(true);

      // Determine if it's email or phone
      const isEmail = validated.contact.includes("@");
      const isPhone = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(validated.contact);
      if (!isEmail && !isPhone) {
        toast.error("Por favor, insira um email válido ou telefone no formato (11) 99999-9999");
        return;
      }

      // Find user by email or phone
      let userId: string | null = null;
      if (isEmail) {
        // Find user by email in auth metadata or profiles
        const {
          data: profiles
        } = await supabase.from("profiles").select("id").limit(1000);

        // We can't directly query auth.users, so we'll need to match by asking user to search
        toast.error("Adicionar por email será implementado em breve. Use telefone por enquanto.");
        return;
      } else {
        const {
          data: profileData
        } = await supabase.from("profiles").select("id").eq("phone", validated.contact).single();
        userId = profileData?.id || null;
      }
      if (!userId) {
        toast.error("Usuário não encontrado com este email/telefone");
        return;
      }

      // Add user to group
      const {
        error
      } = await supabase.from("group_members").insert({
        group_id: selectedGroupId,
        user_id: userId
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("Este usuário já faz parte do grupo");
        } else {
          throw error;
        }
      } else {
        toast.success("Convite enviado com sucesso!");
        setInviteForm({
          contact: ""
        });
        setInviteDialogOpen(false);
        if (communityId) fetchGroups(communityId);
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Erro de validação");
      } else {
        toast.error("Erro ao enviar convite: " + error.message);
      }
    } finally {
      setInviting(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <nav className="container mx-auto px-6 py-4 flex items-center gap-4">
          
          <div className="flex-1">
            <h1 className="text-2xl font-medium">{community?.name}</h1>
            <p className="text-sm text-muted-foreground">{community?.subject}</p>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Courses Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-medium">Cursos</h2>
            </div>

            {/* Courses List - WhatsApp Style */}
            <div className="space-y-1">
              {courses.map(course => {
              const initials = course.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
              return <Card key={course.id} className="p-4 cursor-pointer hover:bg-accent transition-colors border-0 border-b rounded-none first:rounded-t-lg last:rounded-b-lg" onClick={() => navigate(`/courses/${course.id}`)}>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <GraduationCap className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-medium truncate">{course.name}</h3>
                          <div className="flex gap-2 shrink-0">
                            <Badge variant="secondary">
                              {course.lesson_count || 0} aulas
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => {
                          e.stopPropagation();
                          navigate(`/courses/${course.id}/manage`);
                        }}>
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {course.description || "Sem descrição"}
                        </p>
                      </div>
                    </div>
                  </Card>;
            })}

              {courses.length === 0 && <Card className="p-12 flex flex-col items-center justify-center border-2 border-dashed">
                  <GraduationCap className="h-12 w-12 mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-center">
                    Nenhum curso criado ainda. Crie o primeiro curso!
                  </p>
                </Card>}
            </div>
          </div>

          {/* Events Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-medium">Eventos</h2>
            </div>

            {/* Events List - WhatsApp Style */}
            <div className="space-y-1">
              {events.map(event => {
              const eventDate = new Date(event.event_date);
              const formatDate = () => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const eventDay = new Date(eventDate);
                eventDay.setHours(0, 0, 0, 0);
                if (eventDay.getTime() === today.getTime()) return "Hoje";
                if (eventDay.getTime() === tomorrow.getTime()) return "Amanhã";
                return eventDate.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });
              };
              const formatTime = () => {
                return eventDate.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
              };
              return <Card key={event.id} className="p-4 cursor-pointer hover:bg-accent transition-colors border-0 border-b rounded-none first:rounded-t-lg last:rounded-b-lg" onClick={() => navigate('/events')}>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <Calendar className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-medium truncate">{event.title}</h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate()} às {formatTime()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-2">
                          {event.description || "Sem descrição"}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="secondary">
                            <Users className="h-3 w-3 mr-1" />
                            {event.participant_count} participantes
                          </Badge>
                          {event.group_names.length > 0 && <Badge variant="outline" className="truncate max-w-[200px]">
                              {event.group_names.join(', ')}
                            </Badge>}
                        </div>
                      </div>
                    </div>
                  </Card>;
            })}

              {events.length === 0 && <Card className="p-12 flex flex-col items-center justify-center border-2 border-dashed">
                  <Calendar className="h-12 w-12 mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-center">
                    Nenhum evento próximo. Crie o primeiro evento!
                  </p>
                </Card>}
            </div>
          </div>

          {/* Submissions Section - For Teachers */}
          {isTeacher && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-medium">Tarefas Pendentes de Correção</h2>
              </div>

              <div className="space-y-2">
                {pendingSubmissions.map((submission) => (
                  <SubmissionCard
                    key={submission.id}
                    taskName={submission.task_name}
                    studentName={submission.student_name}
                    studentAvatar={submission.student_avatar}
                    createdAt={submission.created_at}
                    status={submission.status}
                    onClick={() => {
                      setSelectedSubmission(submission);
                      setReviewDialogOpen(true);
                    }}
                  />
                ))}

                {pendingSubmissions.length === 0 && (
                  <Card className="p-12 flex flex-col items-center justify-center border-2 border-dashed">
                    <FileText className="h-12 w-12 mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground text-center">
                      Nenhuma tarefa pendente de correção no momento.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Submissions Section - For Students */}
          {!isTeacher && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-medium">Minhas Tarefas</h2>
                {communityId && <SubmitTaskDialog communityId={communityId} />}
              </div>

              <div className="space-y-6">
                {/* Pending Submissions */}
                {mySubmissions.filter(s => s.status === "pending").length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-muted-foreground">Aguardando Correção</h3>
                    {mySubmissions
                      .filter(s => s.status === "pending")
                      .map((submission) => (
                        <SubmissionCard
                          key={submission.id}
                          taskName={submission.task_name}
                          createdAt={submission.created_at}
                          status={submission.status}
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setViewDialogOpen(true);
                          }}
                        />
                      ))}
                  </div>
                )}

                {/* Reviewed Submissions */}
                {mySubmissions.filter(s => s.status === "reviewed").length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-muted-foreground">Corrigidas</h3>
                    {mySubmissions
                      .filter(s => s.status === "reviewed")
                      .map((submission) => (
                        <SubmissionCard
                          key={submission.id}
                          taskName={submission.task_name}
                          createdAt={submission.created_at}
                          status={submission.status}
                          grade={submission.grade}
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setViewDialogOpen(true);
                          }}
                        />
                      ))}
                  </div>
                )}

                {mySubmissions.length === 0 && (
                  <Card className="p-12 flex flex-col items-center justify-center border-2 border-dashed">
                    <FileText className="h-12 w-12 mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground text-center mb-4">
                      Você ainda não enviou nenhuma tarefa.
                    </p>
                    {communityId && <SubmitTaskDialog communityId={communityId} />}
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Groups Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-medium">Grupos de Conversa</h2>
              <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Grupo</DialogTitle>
                    <DialogDescription>
                      Crie um grupo de conversa para os alunos
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-name">Nome do grupo</Label>
                      <Input id="group-name" value={groupForm.name} onChange={e => setGroupForm({
                      ...groupForm,
                      name: e.target.value
                    })} placeholder="Ex: Turma 3A" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="group-description">Descrição (opcional)</Label>
                      <Textarea id="group-description" value={groupForm.description} onChange={e => setGroupForm({
                      ...groupForm,
                      description: e.target.value
                    })} placeholder="Descreva o grupo" rows={3} />
                    </div>

                    <div className="space-y-4 py-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="is-visible">Grupo visível para todos</Label>
                          <p className="text-sm text-muted-foreground">
                            Todos os membros podem ver este grupo
                          </p>
                        </div>
                        <Switch id="is-visible" checked={groupForm.is_visible} onCheckedChange={checked => setGroupForm({
                        ...groupForm,
                        is_visible: checked
                      })} />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="students-can-message">Alunos podem enviar mensagens</Label>
                          <p className="text-sm text-muted-foreground">
                            Permite que alunos enviem mensagens neste grupo
                          </p>
                        </div>
                        <Switch id="students-can-message" checked={groupForm.students_can_message} onCheckedChange={checked => setGroupForm({
                        ...groupForm,
                        students_can_message: checked
                      })} />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setCreateGroupOpen(false)} disabled={creating}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={creating}>
                        {creating ? "Criando..." : "Criar Grupo"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Groups List - WhatsApp Style */}
            <div className="space-y-1">
              {groups.map(group => {
              const initials = group.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
              const formatTime = (timestamp: string | null) => {
                if (!timestamp) return "";
                const date = new Date(timestamp);
                const now = new Date();
                const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
                if (diffInHours < 24) {
                  return date.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                } else if (diffInHours < 168) {
                  return date.toLocaleDateString('pt-BR', {
                    weekday: 'short'
                  });
                } else {
                  return date.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit'
                  });
                }
              };
              return <Card key={group.id} className="p-4 cursor-pointer hover:bg-accent transition-colors border-0 border-b rounded-none first:rounded-t-lg last:rounded-b-lg" onClick={() => navigate(`/groups/${group.id}/chat`)}>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-medium truncate">{group.name}</h3>
                          {group.last_message_time && <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTime(group.last_message_time)}
                            </span>}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {group.last_message ? <>
                              <span className="font-medium">{group.last_message_sender || "Usuário"}:</span>{" "}
                              {group.last_message}
                            </> : group.description || "Nenhuma mensagem ainda"}
                        </p>
                      </div>

                      
                    </div>
                  </Card>;
            })}

              {groups.length === 0 && <Card className="p-12 flex flex-col items-center justify-center border-2 border-dashed">
                  <p className="text-muted-foreground text-center">
                    Nenhum grupo criado ainda. Crie o primeiro grupo!
                  </p>
                </Card>}
            </div>
          </div>
        </div>
      </main>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Alunos</DialogTitle>
            <DialogDescription>
              Adicione alunos ao grupo usando email ou telefone
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Email ou Telefone</Label>
              <Input id="contact" value={inviteForm.contact} onChange={e => setInviteForm({
              ...inviteForm,
              contact: e.target.value
            })} placeholder="email@exemplo.com ou (11) 99999-9999" />
              <p className="text-xs text-muted-foreground">
                O aluno deve estar cadastrado no sistema
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={inviting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Submission Dialog - For Teachers */}
      {selectedSubmission && (
        <ReviewSubmissionDialog
          submission={selectedSubmission}
          studentName={selectedSubmission.student_name}
          studentAvatar={selectedSubmission.student_avatar}
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          onReviewComplete={handleReviewComplete}
        />
      )}

      {/* View Submission Dialog - For Students */}
      {selectedSubmission && (
        <ViewSubmissionDialog
          submission={selectedSubmission}
          teacherName={selectedSubmission.teacher_name}
          teacherAvatar={selectedSubmission.teacher_avatar}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
        />
      )}
    </div>;
};
export default CommunityManagement;