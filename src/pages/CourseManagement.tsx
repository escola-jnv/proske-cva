import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GraduationCap,
  BookOpen,
  Video,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";

const courseSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().trim().optional(),
});

const moduleSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres"),
});

const lessonSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres"),
  youtube_url: z.string().url("URL inválida").refine(
    (url) => url.includes("youtube.com") || url.includes("youtu.be"),
    { message: "Deve ser um link do YouTube" }
  ),
});

type Course = {
  id: string;
  name: string;
  description: string | null;
  community_id: string;
};

type Module = {
  id: string;
  name: string;
  order_index: number;
};

type Lesson = {
  id: string;
  module_id: string;
  name: string;
  youtube_url: string;
  order_index: number;
};

const CourseManagement = () => {
  const navigate = useNavigate();
  const { courseId, communityId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [loading, setLoading] = useState(true);
  const [isNewCourse, setIsNewCourse] = useState(!courseId);
  
  // Course form
  const [courseForm, setCourseForm] = useState({ name: "", description: "" });
  
  // Module dialog
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleForm, setModuleForm] = useState({ name: "" });
  
  // Lesson dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    name: "",
    youtube_url: "",
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else if (courseId) {
        fetchCourseData(courseId, session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, [navigate, courseId]);

  const fetchCourseData = async (cId: string, userId: string) => {
    try {
      setLoading(true);

      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", cId)
        .single();

      if (courseError) throw courseError;

      if (courseData.created_by !== userId) {
        toast.error("Você não tem permissão para gerenciar este curso");
        navigate("/communities");
        return;
      }

      setCourse(courseData);
      setCourseForm({
        name: courseData.name,
        description: courseData.description || "",
      });

      const { data: modulesData, error: modulesError } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", cId)
        .order("order_index");

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      const lessonsMap: Record<string, Lesson[]> = {};
      for (const module of modulesData || []) {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from("course_lessons")
          .select("*")
          .eq("module_id", module.id)
          .order("order_index");

        if (lessonsError) throw lessonsError;
        lessonsMap[module.id] = lessonsData || [];
      }
      setLessons(lessonsMap);
    } catch (error: any) {
      console.error("Error fetching course:", error);
      toast.error("Erro ao carregar curso");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    try {
      const validated = courseSchema.parse(courseForm);
      setSaving(true);

      if (isNewCourse) {
        // Create new course
        if (!communityId) {
          toast.error("ID da comunidade não encontrado");
          return;
        }

        const { data, error } = await supabase
          .from("courses")
          .insert({
            community_id: communityId,
            name: validated.name,
            description: validated.description || null,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;

        toast.success("Curso criado com sucesso!");
        navigate(`/courses/${data.id}/manage`, { replace: true });
        setIsNewCourse(false);
        setCourse(data);
      } else {
        // Update existing course
        const { error } = await supabase
          .from("courses")
          .update({
            name: validated.name,
            description: validated.description || null,
          })
          .eq("id", courseId);

        if (error) throw error;

        toast.success("Curso atualizado!");
        if (course) {
          setCourse({ ...course, name: validated.name, description: validated.description || null });
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Erro de validação");
      } else {
        toast.error("Erro ao salvar curso: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateModule = async () => {
    if (!course) {
      toast.error("Salve o curso antes de adicionar módulos");
      return;
    }

    try {
      const validated = moduleSchema.parse(moduleForm);
      setSaving(true);

      const { data, error } = await supabase
        .from("course_modules")
        .insert({
          course_id: course.id,
          name: validated.name,
          order_index: modules.length,
        })
        .select()
        .single();

      if (error) throw error;

      setModules([...modules, data]);
      setModuleForm({ name: "" });
      setModuleDialogOpen(false);
      toast.success("Módulo criado!");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message);
      } else {
        toast.error("Erro ao criar módulo: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Tem certeza? Todas as aulas deste módulo serão deletadas.")) return;

    try {
      const { error } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;

      setModules(modules.filter((m) => m.id !== moduleId));
      const newLessons = { ...lessons };
      delete newLessons[moduleId];
      setLessons(newLessons);
      toast.success("Módulo deletado!");
    } catch (error: any) {
      toast.error("Erro ao deletar módulo: " + error.message);
    }
  };

  const handleCreateLesson = async () => {
    if (!selectedModuleId) return;

    try {
      const validated = lessonSchema.parse(lessonForm);
      setSaving(true);

      const currentLessons = lessons[selectedModuleId] || [];
      const { data, error } = await supabase
        .from("course_lessons")
        .insert({
          module_id: selectedModuleId,
          name: validated.name,
          youtube_url: validated.youtube_url,
          order_index: currentLessons.length,
        })
        .select()
        .single();

      if (error) throw error;

      setLessons({
        ...lessons,
        [selectedModuleId]: [...currentLessons, data],
      });
      setLessonForm({ name: "", youtube_url: "" });
      setLessonDialogOpen(false);
      toast.success("Aula criada!");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message);
      } else {
        toast.error("Erro ao criar aula: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta aula?")) return;

    try {
      const { error } = await supabase
        .from("course_lessons")
        .delete()
        .eq("id", lessonId);

      if (error) throw error;

      setLessons({
        ...lessons,
        [moduleId]: lessons[moduleId].filter((l) => l.id !== lessonId),
      });
      toast.success("Aula deletada!");
    } catch (error: any) {
      toast.error("Erro ao deletar aula: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const backUrl = communityId 
    ? `/communities/${communityId}/manage` 
    : course 
    ? `/communities/${course.community_id}/manage` 
    : "/communities";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <nav className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(backUrl)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-medium">
              {isNewCourse ? "Criar Novo Curso" : "Gerenciar Curso"}
            </h1>
          </div>
          {!isNewCourse && (
            <Button onClick={() => navigate(`/courses/${courseId}`)}>
              Ver Curso
            </Button>
          )}
        </nav>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Course Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Informações do Curso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course-name">Nome do Curso</Label>
              <Input
                id="course-name"
                value={courseForm.name}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, name: e.target.value })
                }
                placeholder="Ex: Violão Completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-description">Descrição (opcional)</Label>
              <Textarea
                id="course-description"
                value={courseForm.description}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, description: e.target.value })
                }
                placeholder="Descreva o curso..."
                rows={3}
              />
            </div>

            <Button onClick={handleSaveCourse} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : isNewCourse ? "Criar Curso" : "Salvar Alterações"}
            </Button>
          </CardContent>
        </Card>

        {/* Modules and Lessons */}
        {!isNewCourse && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Módulos e Aulas
                </CardTitle>
                <Button onClick={() => setModuleDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Módulo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {modules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum módulo criado ainda</p>
                  <p className="text-sm">Clique em "Novo Módulo" para começar</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2">
                  {modules.map((module) => (
                    <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full mr-4">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span className="font-medium">{module.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {lessons[module.id]?.length || 0} aulas
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteModule(module.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedModuleId(module.id);
                              setLessonDialogOpen(true);
                            }}
                            className="mb-4"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Aula
                          </Button>

                          {lessons[module.id]?.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4">
                              Nenhuma aula neste módulo
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {lessons[module.id]?.map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <Video className="h-4 w-4 text-primary" />
                                    <div>
                                      <p className="font-medium">{lesson.name}</p>
                                      <a
                                        href={lesson.youtube_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline"
                                      >
                                        Ver vídeo
                                      </a>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDeleteLesson(module.id, lesson.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Module Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Módulo</DialogTitle>
            <DialogDescription>
              Crie um módulo para organizar as aulas do curso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="module-name">Nome do Módulo</Label>
              <Input
                id="module-name"
                value={moduleForm.name}
                onChange={(e) => setModuleForm({ name: e.target.value })}
                placeholder="Ex: Introdução ao Violão"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateModule} disabled={saving}>
              {saving ? "Criando..." : "Criar Módulo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Aula</DialogTitle>
            <DialogDescription>
              Adicione uma aula com link do YouTube
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-name">Nome da Aula</Label>
              <Input
                id="lesson-name"
                value={lessonForm.name}
                onChange={(e) =>
                  setLessonForm({ ...lessonForm, name: e.target.value })
                }
                placeholder="Ex: Primeira Música"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLesson} disabled={saving}>
              {saving ? "Criando..." : "Criar Aula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseManagement;
