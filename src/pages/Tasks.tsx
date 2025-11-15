import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmissionCard } from "@/components/SubmissionCard";
import { AssignedTaskCard } from "@/components/AssignedTaskCard";
import { SubmitTaskDialog } from "@/components/SubmitTaskDialog";
import { ReviewSubmissionDialog } from "@/components/ReviewSubmissionDialog";
import { ViewSubmissionDialog } from "@/components/ViewSubmissionDialog";
import { ViewAssignedTaskDialog } from "@/components/ViewAssignedTaskDialog";
import { ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
type Submission = {
  id: string;
  task_name: string;
  video_url: string;
  status: "pending" | "reviewed";
  grade: number | null;
  teacher_comments: string | null;
  created_at: string;
  recording_date: string;
  extra_notes: string | null;
  student_id: string;
  community_id: string;
  student_name: string;
  student_avatar: string | null;
  task_code?: string | null;
};

type AssignedTask = {
  id: string;
  title: string;
  description: string;
  youtube_url?: string | null;
  pdf_url?: string | null;
  deadline?: string | null;
  created_at: string;
  status: "pending" | "completed";
  assigned_task_id: string;
};
const Tasks = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
  const [reviewedSubmissions, setReviewedSubmissions] = useState<Submission[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    submission: Submission | null;
  }>({
    open: false,
    submission: null
  });
  const [viewDialog, setViewDialog] = useState<{
    open: boolean;
    submission: Submission | null;
  }>({
    open: false,
    submission: null
  });
  const [assignedTaskDialog, setAssignedTaskDialog] = useState<{
    open: boolean;
    task: AssignedTask | null;
  }>({
    open: false,
    task: null
  });
  const [communityId, setCommunityId] = useState<string>("");
  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setUser(currentSession?.user ?? null);
      if (!currentSession?.user) {
        navigate("/auth");
      }
    });
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        checkRoleAndFetchData(session.user.id);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const checkRoleAndFetchData = async (userId: string) => {
    try {
      // Check if user is teacher or admin
      const {
        data: userRoles
      } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const isTeacherOrAdmin = userRoles?.some(r => r.role === "teacher" || r.role === "admin");
      setIsTeacher(isTeacherOrAdmin || false);

      // Get first community for submit dialog
      const {
        data: memberData
      } = await supabase.from("community_members").select("community_id").eq("user_id", userId).limit(1).single();
      if (memberData) {
        setCommunityId(memberData.community_id);
      }
      await fetchSubmissions(userId, isTeacherOrAdmin);
      if (!isTeacherOrAdmin) {
        await fetchAssignedTasks(userId);
      }
    } catch (error: any) {
      console.error("Error checking role:", error);
    }
  };
  const fetchSubmissions = async (userId: string, isTeacherOrAdmin: boolean) => {
    try {
      if (isTeacherOrAdmin) {
        // Fetch all submissions for teachers
        const { data: pendingData, error: pendingError } = await supabase
          .from("submissions")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (pendingError) throw pendingError;

        const { data: reviewedData, error: reviewedError } = await supabase
          .from("submissions")
          .select("*")
          .eq("status", "reviewed")
          .order("reviewed_at", { ascending: false });

        if (reviewedError) throw reviewedError;

        // Fetch profiles for all student IDs
        const studentIds = [
          ...(pendingData?.map(s => s.student_id) || []),
          ...(reviewedData?.map(s => s.student_id) || [])
        ];
        
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", studentIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        setPendingSubmissions(pendingData?.map((s: any) => ({
          ...s,
          student_name: profilesMap.get(s.student_id)?.name || "Desconhecido",
          student_avatar: profilesMap.get(s.student_id)?.avatar_url || null
        })) || []);

        setReviewedSubmissions(reviewedData?.map((s: any) => ({
          ...s,
          student_name: profilesMap.get(s.student_id)?.name || "Desconhecido",
          student_avatar: profilesMap.get(s.student_id)?.avatar_url || null
        })) || []);
      } else {
        // Fetch only user's submissions for students
        const { data, error } = await supabase
          .from("submissions")
          .select("*")
          .eq("student_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch user's own profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("name, avatar_url")
          .eq("id", userId)
          .single();

        setMySubmissions(data?.map((s: any) => ({
          ...s,
          student_name: profileData?.name || "Você",
          student_avatar: profileData?.avatar_url || null
        })) || []);
      }
    } catch (error: any) {
      console.error("Error fetching submissions:", error);
      toast.error("Erro ao carregar tarefas");
    }
  };

  const fetchAssignedTasks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("assigned_task_students")
        .select(`
          id,
          status,
          assigned_task_id,
          assigned_tasks!inner (
            id,
            title,
            description,
            youtube_url,
            pdf_url,
            deadline,
            created_at
          )
        `)
        .eq("student_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tasks = (data || []).map((item: any) => ({
        id: item.id,
        assigned_task_id: item.assigned_task_id,
        title: item.assigned_tasks.title,
        description: item.assigned_tasks.description,
        youtube_url: item.assigned_tasks.youtube_url,
        pdf_url: item.assigned_tasks.pdf_url,
        deadline: item.assigned_tasks.deadline,
        created_at: item.assigned_tasks.created_at,
        status: item.status,
      }));

      setAssignedTasks(tasks);
    } catch (error: any) {
      console.error("Error fetching assigned tasks:", error);
    }
  };

  const handleReviewClick = (submission: Submission) => {
    setReviewDialog({
      open: true,
      submission
    });
  };
  const handleViewClick = (submission: Submission) => {
    setViewDialog({
      open: true,
      submission
    });
  };
  const handleReviewComplete = () => {
    if (user) {
      checkRoleAndFetchData(user.id);
    }
    setReviewDialog({
      open: false,
      submission: null
    });
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>;
  }
  const pendingCount = isTeacher ? pendingSubmissions.length : mySubmissions.filter(s => s.status === "pending").length;
  const completedCount = isTeacher ? reviewedSubmissions.length : mySubmissions.filter(s => s.status === "reviewed").length;
  return <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <nav className="container mx-auto px-6 py-4 flex items-center gap-4">
          
          <div className="flex-1">
            <h1 className="text-2xl font-medium">Tarefas</h1>
            <p className="text-sm text-muted-foreground">
              {isTeacher ? "Gerencie tarefas dos alunos" : "Visualize suas tarefas"}
            </p>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue={isTeacher ? "pending" : "assigned"} className="space-y-6">
            <TabsList className={cn(
              "grid w-full max-w-md",
              isTeacher ? "grid-cols-2" : "grid-cols-3"
            )}>
              {!isTeacher && (
                <TabsTrigger value="assigned">
                  Atribuídas ({assignedTasks.filter(t => t.status === 'pending').length})
                </TabsTrigger>
              )}
              <TabsTrigger value="pending">
                Pendentes ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Concluídas ({completedCount})
              </TabsTrigger>
            </TabsList>

            {/* Teacher View - Pending */}
            {isTeacher && <>
                <TabsContent value="pending" className="space-y-4">
                  {pendingSubmissions.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Nenhuma tarefa pendente</h3>
                      <p className="text-muted-foreground">
                        Todas as tarefas foram corrigidas
                      </p>
                    </div> : pendingSubmissions.map(submission => <SubmissionCard key={submission.id} taskId={submission.id} taskName={submission.task_name} studentName={submission.student_name} studentAvatar={submission.student_avatar} createdAt={submission.created_at} status={submission.status} grade={submission.grade || undefined} onClick={() => handleReviewClick(submission)} />)}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                  {reviewedSubmissions.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Nenhuma tarefa corrigida</h3>
                      <p className="text-muted-foreground">
                        Tarefas corrigidas aparecerão aqui
                      </p>
                    </div> : reviewedSubmissions.map(submission => <SubmissionCard key={submission.id} taskId={submission.id} taskName={submission.task_name} studentName={submission.student_name} studentAvatar={submission.student_avatar} createdAt={submission.created_at} status={submission.status} grade={submission.grade || undefined} onClick={() => handleViewClick(submission)} />)}
                </TabsContent>
              </>}

            {/* Student View */}
            {!isTeacher && <>
                {/* Assigned Tasks Tab */}
                <TabsContent value="assigned" className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-medium">Tarefas Atribuídas</h2>
                  </div>

                  {assignedTasks.filter(t => t.status === 'pending').length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Nenhuma tarefa atribuída</h3>
                      <p className="text-muted-foreground">
                        Você não tem tarefas pendentes atribuídas pelos professores
                      </p>
                    </div>
                  ) : (
                    assignedTasks
                      .filter(t => t.status === 'pending')
                      .map(task => (
                        <AssignedTaskCard
                          key={task.id}
                          title={task.title}
                          description={task.description}
                          deadline={task.deadline}
                          createdAt={task.created_at}
                          status={task.status}
                          onClick={() => setAssignedTaskDialog({ open: true, task })}
                        />
                      ))
                  )}
                </TabsContent>

                <TabsContent value="pending" className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-medium">Aguardando Correção</h2>
                    {communityId && <SubmitTaskDialog communityId={communityId} />}
                  </div>
                  
                  {mySubmissions.filter(s => s.status === "pending").length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Nenhuma tarefa pendente</h3>
                      <p className="text-muted-foreground">
                        Envie uma nova tarefa para aparecer aqui
                      </p>
                    </div> : mySubmissions.filter(s => s.status === "pending").map(submission => <SubmissionCard key={submission.id} taskId={submission.id} taskName={submission.task_name} studentName="Você" studentAvatar={submission.student_avatar} createdAt={submission.created_at} status={submission.status} grade={submission.grade || undefined} onClick={() => handleViewClick(submission)} />)}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                  <h2 className="text-xl font-medium mb-4">Já Corrigidas</h2>
                  
                  {mySubmissions.filter(s => s.status === "reviewed").length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Nenhuma tarefa corrigida</h3>
                      <p className="text-muted-foreground">
                        Tarefas corrigidas aparecerão aqui
                      </p>
                    </div> : mySubmissions.filter(s => s.status === "reviewed").map(submission => <SubmissionCard key={submission.id} taskId={submission.id} taskName={submission.task_name} studentName="Você" studentAvatar={submission.student_avatar} createdAt={submission.created_at} status={submission.status} grade={submission.grade || undefined} onClick={() => handleViewClick(submission)} />)}
                </TabsContent>
              </>}
          </Tabs>
        </div>
      </main>

      {/* Review Dialog - Teachers only */}
      {reviewDialog.submission && <ReviewSubmissionDialog submission={{
      id: reviewDialog.submission.id,
      task_name: reviewDialog.submission.task_name,
      video_url: reviewDialog.submission.video_url,
      recording_date: reviewDialog.submission.recording_date,
      extra_notes: reviewDialog.submission.extra_notes || undefined,
      student_id: reviewDialog.submission.student_id,
      community_id: reviewDialog.submission.community_id,
      created_at: reviewDialog.submission.created_at
    }} studentName={reviewDialog.submission.student_name} studentAvatar={reviewDialog.submission.student_avatar || undefined} open={reviewDialog.open} onOpenChange={open => {
      if (!open) {
        setReviewDialog({
          open: false,
          submission: null
        });
      }
    }} onReviewComplete={handleReviewComplete} />}

      {/* View Dialog - For viewing submissions */}
      {viewDialog.submission && <ViewSubmissionDialog submission={{
      task_name: viewDialog.submission.task_name,
      video_url: viewDialog.submission.video_url,
      recording_date: viewDialog.submission.recording_date,
      extra_notes: viewDialog.submission.extra_notes || undefined,
      teacher_comments: viewDialog.submission.teacher_comments || undefined,
      grade: viewDialog.submission.grade || undefined,
      status: viewDialog.submission.status
    }} open={viewDialog.open} onOpenChange={open => {
      if (!open) {
        setViewDialog({
          open: false,
          submission: null
        });
      }
    }} />}

      {/* Assigned Task Dialog - For viewing assigned tasks */}
      {assignedTaskDialog.task && (
        <ViewAssignedTaskDialog
          task={assignedTaskDialog.task}
          open={assignedTaskDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setAssignedTaskDialog({ open: false, task: null });
            }
          }}
          onSubmit={() => {
            setAssignedTaskDialog({ open: false, task: null });
            // Open submit dialog with task pre-filled
            // TODO: enhance SubmitTaskDialog to accept pre-filled data
          }}
        />
      )}
    </div>;
};
export default Tasks;