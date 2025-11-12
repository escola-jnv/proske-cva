import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  GraduationCap,
  BookOpen,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";

const moduleSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().trim().optional(),
});

const lessonSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().trim().optional(),
  youtube_url: z.string().url("URL inválida").includes("youtube", {
    message: "Deve ser um link do YouTube",
  }),
  duration_minutes: z.number().min(1).optional(),
});

type Course = {
  id: string;
  name: string;
  description: string | null;
};

type Module = {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
};

type Lesson = {
  id: string;
  module_id: string;
  name: string;
  description: string | null;
  youtube_url: string;
  duration_minutes: number | null;
  order_index: number;
};

const CourseManagement = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [loading, setLoading] = useState(true);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState({ name: "", description: "" });
  const [lessonForm, setLessonForm] = useState({
    name: "",
    description: "",
    youtube_url: "",
    duration_minutes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else if (courseId) {
        fetchCourseData(courseId, session.user.id);
      }
    });
  }, [navigate, courseId]);

  const fetchCourseData = async (cId: string, userId: string) => {
    try {
      setLoading(true);

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", cId)
        .single();

      if (courseError) throw courseError;

      // Check if user is creator
      if (courseData.created_by !== userId) {
        toast.error("Você não tem permissão para gerenciar este curso");
        navigate("/communities");
        return;
      }

      setCourse(courseData);

      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", cId)
        .order("order_index");

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      // Fetch lessons for all modules
      if (modulesData && modulesData.length > 0) {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from("course_lessons")
          .select("*")
          .in("module_id", modulesData.map((m) => m.id))
          .order("order_index");

        if (lessonsError) throw lessonsError;

        const lessonsByModule: Record<string, Lesson[]> = {};
        (lessonsData || []).forEach((lesson: Lesson) => {
          if (!lessonsByModule[lesson.module_id]) {
            lessonsByModule[lesson.module_id] = [];
          }
          lessonsByModule[lesson.module_id].push(lesson);
        });
        setLessons(lessonsByModule);
      }
    } catch (error: any) {
      console.error("Error fetching course:", error);
      toast.error("Erro ao carregar curso");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = moduleSchema.parse(moduleForm);
      setSaving(true);

      const { error } = await supabase.from("course_modules").insert({
        course_id: courseId,
        name: validated.name,
        description: validated.description || null,
        order_index: modules.length,
      });

      if (error) throw error;

      toast.success("Módulo criado com sucesso!");
      setModuleForm({ name: "", description: "" });
      setModuleDialogOpen(false);
      if (courseId && user) fetchCourseData(courseId, user.id);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Erro de validação");
      } else {
        toast.error("Erro ao criar módulo: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedModuleId) return;

    try {
      const validated = lessonSchema.parse({
        ...lessonForm,
        duration_minutes: lessonForm.duration_minutes
          ? parseInt(lessonForm.duration_minutes)
          : undefined,
      });
      setSaving(true);

      const moduleLessons = lessons[selectedModuleId] || [];

      const { error } = await supabase.from("course_lessons").insert({
        module_id: selectedModuleId,
        name: validated.name,
        description: validated.description || null,
        youtube_url: validated.youtube_url,
        duration_minutes: validated.duration_minutes || null,
        order_index: moduleLessons.length,
      });

      if (error) throw error;

      toast.success("Aula criada com sucesso!");
      setLessonForm({ name: "", description: "", youtube_url: "", duration_minutes: "" });
      setLessonDialogOpen(false);
      setSelectedModuleId(null);
      if (courseId && user) fetchCourseData(courseId, user.id);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Erro de validação");
      } else {
        toast.error("Erro ao criar aula: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Tem certeza que deseja excluir este módulo e todas as suas aulas?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;

      toast.success("Módulo excluído com sucesso!");
      if (courseId && user) fetchCourseData(courseId, user.id);
    } catch (error: any) {
      toast.error("Erro ao excluir módulo: " + error.message);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta aula?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("course_lessons")
        .delete()
        .eq("id", lessonId);

      if (error) throw error;

      toast.success("Aula excluída com sucesso!");
      if (courseId && user) fetchCourseData(courseId, user.id);
    } catch (error: any) {
      toast.error("Erro ao excluir aula: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <nav className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-medium">{course?.name}</h1>
            {course?.description && (
              <p className="text-sm text-muted-foreground">{course.description}</p>
            )}
          </div>
          <Button onClick={() => navigate(`/courses/${courseId}`)}>
            <GraduationCap className="h-4 w-4 mr-2" />
            Ver Curso
          </Button>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Modules Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-medium">Módulos e Aulas</h2>
              <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Módulo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Módulo</DialogTitle>
                    <DialogDescription>
                      Organize suas aulas em módulos
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateModule} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="module-name">Nome do módulo</Label>
                      <Input
                        id="module-name"
                        value={moduleForm.name}
                        onChange={(e) =>
                          setModuleForm({ ...moduleForm, name: e.target.value })
                        }
                        placeholder="Ex: Introdução"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="module-description">
                        Descrição (opcional)
                      </Label>
                      <Textarea
                        id="module-description"
                        value={moduleForm.description}
                        onChange={(e) =>
                          setModuleForm({
                            ...moduleForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Descreva o módulo"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setModuleDialogOpen(false)}
                        disabled={saving}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Criando..." : "Criar Módulo"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Modules List */}
            <div className="space-y-6">
              {modules.map((module) => {
                const moduleLessons = lessons[module.id] || [];

                return (
                  <Card key={module.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <h3 className="text-xl font-medium">{module.name}</h3>
                          <Badge variant="secondary">
                            {moduleLessons.length} aulas
                          </Badge>
                        </div>
                        {module.description && (
                          <p className="text-sm text-muted-foreground ml-8">
                            {module.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedModuleId(module.id);
                            setLessonDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteModule(module.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Lessons List */}
                    <div className="ml-8 space-y-2">
                      {moduleLessons.map((lesson, index) => (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent"
                        >
                          <Video className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {index + 1}. {lesson.name}
                            </p>
                            {lesson.duration_minutes && (
                              <p className="text-xs text-muted-foreground">
                                {lesson.duration_minutes} minutos
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteLesson(lesson.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}

                      {moduleLessons.length === 0 && (
                        <p className="text-sm text-muted-foreground p-3">
                          Nenhuma aula adicionada ainda
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}

              {modules.length === 0 && (
                <Card className="p-12 flex flex-col items-center justify-center border-2 border-dashed">
                  <BookOpen className="h-12 w-12 mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-center">
                    Nenhum módulo criado ainda. Crie o primeiro módulo!
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Aula</DialogTitle>
            <DialogDescription>
              Adicione uma aula em vídeo do YouTube
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLesson} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-name">Nome da aula</Label>
              <Input
                id="lesson-name"
                value={lessonForm.name}
                onChange={(e) =>
                  setLessonForm({ ...lessonForm, name: e.target.value })
                }
                placeholder="Ex: Aula 1 - Introdução"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lesson-url">Link do YouTube</Label>
              <Input
                id="lesson-url"
                value={lessonForm.youtube_url}
                onChange={(e) =>
                  setLessonForm({ ...lessonForm, youtube_url: e.target.value })
                }
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lesson-duration">Duração (minutos)</Label>
              <Input
                id="lesson-duration"
                type="number"
                value={lessonForm.duration_minutes}
                onChange={(e) =>
                  setLessonForm({
                    ...lessonForm,
                    duration_minutes: e.target.value,
                  })
                }
                placeholder="Ex: 15"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lesson-description">Descrição (opcional)</Label>
              <Textarea
                id="lesson-description"
                value={lessonForm.description}
                onChange={(e) =>
                  setLessonForm({ ...lessonForm, description: e.target.value })
                }
                placeholder="Descreva o conteúdo da aula"
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLessonDialogOpen(false);
                  setSelectedModuleId(null);
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Criando..." : "Criar Aula"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseManagement;
