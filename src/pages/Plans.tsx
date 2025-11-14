import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, ExternalLink, Calendar, CheckCircle2, Video } from "lucide-react";
import { toast } from "sonner";

type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  billing_frequency: string | null;
  monthly_corrections_limit?: number | null;
  monthly_monitorings_limit?: number | null;
  checkout_url: string | null;
};

type UserSubscription = {
  id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: string;
  plan: SubscriptionPlan;
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
  start_date: string;
  end_date: string;
};

type SubscriptionStats = {
  daysRemaining: number;
  totalDays: number;
  tasksSubmitted: number;
  monitoringsCompleted: number;
};

type CourseAccess = {
  course: Course;
  daysRemaining: number;
};

const Plans = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [courseAccess, setCourseAccess] = useState<CourseAccess[]>([]);

  useEffect(() => {
    checkAuthAndFetchPlans();
  }, []);

  const checkAuthAndFetchPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      await Promise.all([
        fetchPlans(),
        fetchCourses(),
        fetchActiveSubscription(user.id),
        fetchStats(user.id),
        fetchCourseAccess(user.id),
      ]);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price", { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      toast.error("Erro ao carregar planos");
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_visible", true)
        .not("price", "is", null)
        .gt("price", 0)
        .order("name", { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error("Erro ao carregar cursos");
    }
  };

  const fetchActiveSubscription = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq("user_id", userId)
        .eq("status", "active")
        .gt("end_date", new Date().toISOString())
        .order("end_date", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setActiveSubscription(data);
    } catch (error: any) {
      console.error("Error fetching active subscription:", error);
    }
  };

  const fetchStats = async (userId: string) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Fetch subscription to calculate days remaining
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("start_date, end_date")
        .eq("user_id", userId)
        .eq("status", "active")
        .gt("end_date", now.toISOString())
        .order("end_date", { ascending: false })
        .limit(1)
        .single();

      let daysRemaining = 0;
      let totalDays = 30;

      if (subscription) {
        const endDate = new Date(subscription.end_date);
        const startDate = new Date(subscription.start_date);
        daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Count tasks submitted this month
      const { count: tasksCount } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("student_id", userId)
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString());

      // Count monitorings/interviews completed this month
      const { count: monitoringsCount } = await supabase
        .from("interview_schedules" as any)
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "confirmed")
        .gte("scheduled_date", startOfMonth.toISOString().split('T')[0])
        .lte("scheduled_date", endOfMonth.toISOString().split('T')[0]);

      setStats({
        daysRemaining,
        totalDays,
        tasksSubmitted: tasksCount || 0,
        monitoringsCompleted: monitoringsCount || 0,
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchCourseAccess = async (userId: string) => {
    try {
      const now = new Date();
      
      const { data, error } = await supabase
        .from("user_course_access")
        .select(`
          *,
          courses (
            id,
            name,
            description,
            cover_image_url,
            price,
            checkout_url,
            is_visible,
            community_id,
            created_by
          )
        `)
        .eq("user_id", userId)
        .gt("end_date", now.toISOString())
        .order("end_date", { ascending: true });

      if (error) throw error;

      const accessWithDays = data?.map((access: any) => {
        const endDate = new Date(access.end_date);
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          course: access.courses,
          daysRemaining,
        };
      }).filter((access) => access.course) || [];

      setCourseAccess(accessWithDays);
    } catch (error: any) {
      console.error("Error fetching course access:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const calculateProgressPercentage = () => {
    if (!stats) return 0;
    const daysUsed = stats.totalDays - stats.daysRemaining;
    return Math.min(Math.round((daysUsed / stats.totalDays) * 100), 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <nav className="container mx-auto px-6 py-4">
          <div>
            <h1 className="text-2xl font-medium">Assinatura</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie sua assinatura e veja seus planos disponíveis
            </p>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Active Subscription Card */}
          {activeSubscription && stats && (
            <Card className="border-primary bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Plano Ativo</CardTitle>
                    <CardDescription>
                      {(activeSubscription.plan as any).name}
                    </CardDescription>
                  </div>
                  <Badge variant="default" className="text-lg px-4 py-2">
                    R$ {(activeSubscription.plan as any).price.toFixed(2)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Days Remaining Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">Período de assinatura</span>
                    </div>
                    <span className="text-muted-foreground">
                      {stats.daysRemaining} dias restantes
                    </span>
                  </div>
                  <Progress value={calculateProgressPercentage()} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Renovação em {new Date(activeSubscription.end_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Tasks Progress */}
                {(activeSubscription.plan as any).monthly_corrections_limit > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="font-medium">Tarefas enviadas este mês</span>
                      </div>
                      <span className="text-muted-foreground">
                        {stats.tasksSubmitted} / {(activeSubscription.plan as any).monthly_corrections_limit}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((stats.tasksSubmitted / (activeSubscription.plan as any).monthly_corrections_limit) * 100, 100)} 
                      className="h-2" 
                    />
                  </div>
                )}

                {/* Monitorings Progress */}
                {(activeSubscription.plan as any).monthly_monitorings_limit > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-primary" />
                        <span className="font-medium">Monitorias realizadas este mês</span>
                      </div>
                      <span className="text-muted-foreground">
                        {stats.monitoringsCompleted} / {(activeSubscription.plan as any).monthly_monitorings_limit}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((stats.monitoringsCompleted / (activeSubscription.plan as any).monthly_monitorings_limit) * 100, 100)} 
                      className="h-2" 
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Available Plans */}
          <div>
            <h2 className="text-xl font-medium mb-4">Planos Disponíveis</h2>
            {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum plano disponível</h3>
              <p className="text-muted-foreground">
                Entre em contato com a administração
              </p>
            </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => {
                  const isActivePlan = activeSubscription && (activeSubscription.plan as any).id === plan.id;
                  
                  return (
                    <Card 
                      key={plan.id} 
                      className={`flex flex-col ${isActivePlan ? 'border-primary ring-2 ring-primary/20' : ''}`}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {plan.name}
                          <Badge variant={isActivePlan ? "default" : "secondary"} className="ml-2">
                            R$ {plan.price.toFixed(2)}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {plan.billing_frequency === "monthly" ? "Mensal" : 
                           plan.billing_frequency === "yearly" ? "Anual" : 
                           plan.billing_frequency || ""}
                        </CardDescription>
                      </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-3">
                      {plan.description && (
                        <p className="text-sm text-muted-foreground">
                          {plan.description}
                        </p>
                      )}
                      {plan.monthly_monitorings_limit !== null && plan.monthly_monitorings_limit > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Monitorias por mês: </span>
                          <span className="text-muted-foreground">
                            {plan.monthly_monitorings_limit}
                          </span>
                        </div>
                      )}
                      {plan.monthly_corrections_limit !== null && plan.monthly_corrections_limit > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Correções por mês: </span>
                          <span className="text-muted-foreground">
                            {plan.monthly_corrections_limit}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                      {plan.price > 0 && plan.checkout_url && !isActivePlan && (
                        <CardFooter>
                          <Button 
                            className="w-full" 
                            onClick={() => window.open(plan.checkout_url!, '_blank')}
                          >
                            Adquirir Plano
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </CardFooter>
                      )}
                      {isActivePlan && (
                        <CardFooter>
                          <Badge variant="default" className="w-full justify-center py-2">
                            Plano Atual
                          </Badge>
                        </CardFooter>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Course Access */}
          {courseAccess.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-medium mb-4">Meus Cursos</h2>
              <div className="space-y-4">
                {courseAccess.map(({ course, daysRemaining }) => (
                  <Card key={course.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium">{course.name}</h3>
                          {course.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {course.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-4">
                            <Badge variant="outline">
                              {daysRemaining} dias restantes
                            </Badge>
                            <Button
                              variant="default"
                              onClick={() => navigate(`/courses/${course.id}`)}
                            >
                              Acessar Curso
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Available Courses */}
          {courses.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-medium mb-4">Cursos Disponíveis</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => {
                  const hasAccess = courseAccess.some((access) => access.course.id === course.id);
                  
                  return (
                    <Card key={course.id} className="flex flex-col">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {course.name}
                          {course.price && (
                            <Badge variant="secondary" className="ml-2">
                              R$ {course.price.toFixed(2)}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1">
                        {course.description && (
                          <p className="text-sm text-muted-foreground">
                            {course.description}
                          </p>
                        )}
                      </CardContent>
                      {course.checkout_url && !hasAccess && (
                        <CardFooter>
                          <Button 
                            className="w-full" 
                            onClick={() => window.open(course.checkout_url!, '_blank')}
                          >
                            Comprar Curso
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </CardFooter>
                      )}
                      {hasAccess && (
                        <CardFooter>
                          <Badge variant="default" className="w-full justify-center py-2">
                            Você possui acesso
                          </Badge>
                        </CardFooter>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Plans;
