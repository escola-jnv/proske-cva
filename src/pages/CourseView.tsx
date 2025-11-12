import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown, ChevronRight, Play, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

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
  order_index: number;
  duration_minutes: number | null;
  completed?: boolean;
};

const CourseView = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

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
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("*")
        .in("module_id", (modulesData || []).map(m => m.id))
        .order("order_index");

      if (lessonsError) throw lessonsError;

      // Group lessons by module
      const lessonsByModule: Record<string, Lesson[]> = {};
      (lessonsData || []).forEach((lesson: Lesson) => {
        if (!lessonsByModule[lesson.module_id]) {
          lessonsByModule[lesson.module_id] = [];
        }
        lessonsByModule[lesson.module_id].push(lesson);
      });
      setLessons(lessonsByModule);

      // Fetch progress
      const { data: progressData, error: progressError } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", userId)
        .in("lesson_id", (lessonsData || []).map(l => l.id));

      if (progressError) throw progressError;

      const progressMap: Record<string, boolean> = {};
      (progressData || []).forEach((p: any) => {
        progressMap[p.lesson_id] = p.completed;
      });
      setProgress(progressMap);

      // Open first module by default
      if (modulesData && modulesData.length > 0) {
        setOpenModules({ [modulesData[0].id]: true });
      }
    } catch (error: any) {
      console.error("Error fetching course:", error);
      toast.error("Erro ao carregar curso");
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const toggleLessonComplete = async (lessonId: string, currentStatus: boolean) => {
    if (!user) return;

    try {
      const newStatus = !currentStatus;
      
      const { error } = await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          completed: newStatus,
          completed_at: newStatus ? new Date().toISOString() : null,
        });

      if (error) throw error;

      setProgress(prev => ({ ...prev, [lessonId]: newStatus }));
      toast.success(newStatus ? "Aula marcada como concluída" : "Aula desmarcada");
    } catch (error: any) {
      console.error("Error updating progress:", error);
      toast.error("Erro ao atualizar progresso");
    }
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <nav className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-medium">{course?.name}</h1>
            {course?.description && (
              <p className="text-sm text-muted-foreground">{course.description}</p>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar - Modules & Lessons */}
        <aside className="w-80 border-r border-border bg-card">
          <ScrollArea className="h-[calc(100vh-73px)]">
            <div className="p-4 space-y-2">
              {modules.map((module) => {
                const moduleLessons = lessons[module.id] || [];
                const completedCount = moduleLessons.filter(l => progress[l.id]).length;
                
                return (
                  <Collapsible
                    key={module.id}
                    open={openModules[module.id]}
                    onOpenChange={() => toggleModule(module.id)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
                        <div className="flex items-start gap-3">
                          {openModules[module.id] ? (
                            <ChevronDown className="h-5 w-5 mt-0.5 shrink-0" />
                          ) : (
                            <ChevronRight className="h-5 w-5 mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1 text-left">
                            <h3 className="font-medium">{module.name}</h3>
                            {module.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {module.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {completedCount}/{moduleLessons.length} aulas
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-4 mt-1 space-y-1">
                      {moduleLessons.map((lesson) => (
                        <Card
                          key={lesson.id}
                          className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                            selectedLesson?.id === lesson.id ? "bg-accent" : ""
                          }`}
                          onClick={() => handleLessonClick(lesson)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex items-center gap-2 shrink-0">
                              <Checkbox
                                checked={progress[lesson.id] || false}
                                onCheckedChange={() =>
                                  toggleLessonComplete(lesson.id, progress[lesson.id] || false)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                              {progress[lesson.id] ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Play className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{lesson.name}</p>
                              {lesson.duration_minutes && (
                                <p className="text-xs text-muted-foreground">
                                  {lesson.duration_minutes} min
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Video Area */}
        <main className="flex-1 p-6">
          {selectedLesson ? (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {extractYoutubeId(selectedLesson.youtube_url) ? (
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${extractYoutubeId(selectedLesson.youtube_url)}`}
                    title={selectedLesson.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    Link do YouTube inválido
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-3xl font-medium mb-2">{selectedLesson.name}</h2>
                {selectedLesson.description && (
                  <p className="text-muted-foreground">{selectedLesson.description}</p>
                )}
                <div className="flex items-center gap-4 mt-4">
                  <Button
                    variant={progress[selectedLesson.id] ? "secondary" : "default"}
                    onClick={() =>
                      toggleLessonComplete(selectedLesson.id, progress[selectedLesson.id] || false)
                    }
                  >
                    {progress[selectedLesson.id] ? "Marcar como não concluída" : "Marcar como concluída"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Play className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl text-muted-foreground">
                  Selecione uma aula para começar
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CourseView;
