import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { SubmitTaskDialog } from "@/components/SubmitTaskDialog";
import { SubmissionCard } from "@/components/SubmissionCard";
import { ReviewSubmissionDialog } from "@/components/ReviewSubmissionDialog";
import { ViewSubmissionDialog } from "@/components/ViewSubmissionDialog";
import { Input } from "@/components/ui/input";

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

export default function CommunityTasks() {
  const navigate = useNavigate();
  const { communityId } = useParams();
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);
  const [allSubmissions, setAllSubmissions] = useState<SubmissionWithProfile[]>([]);
  const [mySubmissions, setMySubmissions] = useState<SubmissionWithProfile[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithProfile | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["teacher", "admin"]);
      
      const isTeacherOrAdmin = roleData && roleData.length > 0;
      setIsTeacher(isTeacherOrAdmin);

      if (communityId) {
        await fetchSubmissions(communityId, user.id, isTeacherOrAdmin);
      }
      setLoading(false);
    };

    checkAuthAndFetchData();
  }, [communityId, navigate]);

  const fetchSubmissions = async (commId: string, userId: string, isTeacherOrAdmin: boolean) => {
    try {
      if (isTeacherOrAdmin) {
        const { data: submissionsData, error } = await supabase
          .from("submissions")
          .select("*")
          .eq("community_id", commId)
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
              student_name: profile?.name || "Desconhecido",
              student_avatar: profile?.avatar_url,
            };
          })
        );

        setAllSubmissions(submissionsWithProfiles);
      } else {
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
              student_name: "",
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

  const handleReviewComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (communityId && user) {
      await fetchSubmissions(communityId, user.id, isTeacher);
    }
  };

  const filteredSubmissions = (isTeacher ? allSubmissions : mySubmissions).filter(sub => 
    sub.task_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingSubmissions = filteredSubmissions.filter(s => s.status === "pending");
  const reviewedSubmissions = filteredSubmissions.filter(s => s.status === "reviewed");

  if (loading) return <div className="container mx-auto px-6 py-12">Carregando...</div>;

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Tarefas para Correção</h1>
              <p className="text-muted-foreground mt-2">
                {isTeacher 
                  ? "Visualize e corrija as tarefas enviadas pelos alunos"
                  : "Acompanhe suas tarefas enviadas e corrigidas"}
              </p>
            </div>
            {!isTeacher && <SubmitTaskDialog communityId={communityId} />}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por tarefa, aluno ou código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-6 mt-8">
          {pendingSubmissions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Pendentes ({pendingSubmissions.length})</h2>
              {pendingSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  taskId={submission.id}
                  taskName={submission.task_name}
                  studentName={isTeacher ? submission.student_name : undefined}
                  studentAvatar={isTeacher ? submission.student_avatar : undefined}
                  createdAt={submission.created_at}
                  status={submission.status}
                  grade={submission.grade}
                  onClick={() => {
                    setSelectedSubmission(submission);
                    if (isTeacher) {
                      setReviewDialogOpen(true);
                    } else {
                      setViewDialogOpen(true);
                    }
                  }}
                />
              ))}
            </div>
          )}

          {reviewedSubmissions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Corrigidas ({reviewedSubmissions.length})</h2>
              {reviewedSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  taskId={submission.id}
                  taskName={submission.task_name}
                  studentName={isTeacher ? submission.student_name : undefined}
                  studentAvatar={isTeacher ? submission.student_avatar : undefined}
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

          {pendingSubmissions.length === 0 && reviewedSubmissions.length === 0 && (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Tente ajustar sua busca para encontrar tarefas."
                  : isTeacher 
                    ? "Não há tarefas no momento."
                    : "Você ainda não enviou nenhuma tarefa."}
              </p>
            </Card>
          )}
        </div>

        {selectedSubmission && (
          <>
            <ReviewSubmissionDialog
              open={reviewDialogOpen}
              onOpenChange={setReviewDialogOpen}
              submission={selectedSubmission}
              studentName={selectedSubmission.student_name}
              studentAvatar={selectedSubmission.student_avatar}
              onReviewComplete={handleReviewComplete}
            />
            <ViewSubmissionDialog
              open={viewDialogOpen}
              onOpenChange={setViewDialogOpen}
              submission={selectedSubmission}
            />
          </>
        )}
      </div>
    </div>
  );
}
