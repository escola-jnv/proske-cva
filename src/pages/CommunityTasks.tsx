import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { SubmitTaskDialog } from "@/components/SubmitTaskDialog";
import { SubmissionCard } from "@/components/SubmissionCard";
import { ReviewSubmissionDialog } from "@/components/ReviewSubmissionDialog";
import { ViewSubmissionDialog } from "@/components/ViewSubmissionDialog";

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
  const [pendingSubmissions, setPendingSubmissions] = useState<SubmissionWithProfile[]>([]);
  const [mySubmissions, setMySubmissions] = useState<SubmissionWithProfile[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithProfile | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

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
              student_name: profile?.name || "Desconhecido",
              student_avatar: profile?.avatar_url,
            };
          })
        );

        setPendingSubmissions(submissionsWithProfiles);
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

  if (loading) return <div className="container mx-auto px-6 py-12">Carregando...</div>;

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {isTeacher ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-medium">Tarefas para Correção</h2>
            {pendingSubmissions.length > 0 ? (
              <div className="space-y-2">
                {pendingSubmissions.map((submission) => (
                  <SubmissionCard
                    key={submission.id}
                    taskName={submission.task_name}
                    studentName={submission.student_name}
                    createdAt={submission.created_at}
                    status={submission.status}
                    onClick={() => {
                      setSelectedSubmission(submission);
                      setReviewDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 flex flex-col items-center justify-center border-2 border-dashed">
                <FileText className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-center">
                  Não há tarefas pendentes para correção.
                </p>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-medium">Minhas Tarefas</h2>
              {communityId && <SubmitTaskDialog communityId={communityId} />}
            </div>

            <div className="space-y-6">
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
  );
}
