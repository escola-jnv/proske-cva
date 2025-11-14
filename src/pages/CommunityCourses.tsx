import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GraduationCap, Edit } from "lucide-react";

type Course = {
  id: string;
  name: string;
  description: string | null;
  lesson_count?: number;
};

export default function CommunityCourses() {
  const navigate = useNavigate();
  const { communityId } = useParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      if (communityId) {
        await fetchCourses(communityId);
      }
      setLoading(false);
    };

    checkAuthAndFetchData();
  }, [communityId, navigate]);

  const fetchCourses = async (commId: string) => {
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .eq("community_id", commId)
        .order("created_at", { ascending: false });

      if (coursesError) throw coursesError;

      const coursesWithCounts = await Promise.all((coursesData || []).map(async (course: any) => {
        const { data: modulesData } = await supabase
          .from("course_modules")
          .select("id")
          .eq("course_id", course.id);

        const moduleIds = (modulesData || []).map(m => m.id);
        let lessonCount = 0;

        if (moduleIds.length > 0) {
          const { count } = await supabase
            .from("course_lessons")
            .select("*", { count: "exact", head: true })
            .in("module_id", moduleIds);
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

  if (loading) return <div className="container mx-auto px-6 py-12">Carregando...</div>;

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-2xl font-medium">Cursos</h2>

        <div className="space-y-1">
          {courses.map(course => (
            <Card 
              key={course.id} 
              className="p-4 cursor-pointer hover:bg-accent transition-colors border-0 border-b rounded-none first:rounded-t-lg last:rounded-b-lg" 
              onClick={() => navigate(`/courses/${course.id}`)}
            >
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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/courses/${course.id}/manage`);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {course.description || "Sem descrição"}
                  </p>
                </div>
              </div>
            </Card>
          ))}

          {courses.length === 0 && (
            <Card className="p-12 flex flex-col items-center justify-center border-2 border-dashed">
              <GraduationCap className="h-12 w-12 mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Nenhum curso criado ainda. Crie o primeiro curso!
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
