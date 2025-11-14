import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Moon, Sun } from "lucide-react";

const STUDY_GOALS = [
  "Tocar em Casa",
  "Tocar em Visitas/Células",
  "Ensinar",
  "Tocar na Igreja",
  "Tocar em Hospital/Asilos",
  "Tocar em Eventos",
  "Gravar",
  "Compor",
];

const WEEK_DAYS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [studyGoals, setStudyGoals] = useState<string[]>([]);
  const [studyDays, setStudyDays] = useState<number[]>([]);
  const [studySchedule, setStudySchedule] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Redirect to user's community
        setTimeout(async () => {
          await redirectToUserCommunity(session.user.id);
        }, 0);
      }
    });
  }, [navigate]);

  const redirectToUserCommunity = async (userId: string) => {
    try {
      // Check if user is teacher or admin
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const isTeacherOrAdmin = userRoles?.some(
        (r) => r.role === "teacher" || r.role === "admin"
      );

      if (isTeacherOrAdmin) {
        // Teachers and admins see all communities
        const { data: communities } = await supabase
          .from("communities")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1);

        if (communities && communities.length > 0) {
          navigate(`/communities/${communities[0].id}/manage`);
        } else {
          navigate("/communities");
        }
      } else {
        // Students see their groups' communities
        const { data: membershipData } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", userId);

        const groupIds = membershipData?.map((m) => m.group_id) || [];

        if (groupIds.length === 0) {
          navigate("/communities");
          return;
        }

        const { data: groupData } = await supabase
          .from("conversation_groups")
          .select("community_id")
          .in("id", groupIds)
          .limit(1);

        if (groupData && groupData.length > 0) {
          navigate(`/communities/${groupData[0].community_id}/manage`);
        } else {
          navigate("/communities");
        }
      }
    } catch (error) {
      console.error("Error redirecting to community:", error);
      navigate("/communities");
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const formatWhatsapp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsapp(e.target.value));
  };

  const toggleStudyGoal = (goal: string) => {
    setStudyGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const toggleStudyDay = (day: number) => {
    setStudyDays(prev => {
      if (prev.includes(day)) {
        const newSchedule = { ...studySchedule };
        delete newSchedule[day];
        setStudySchedule(newSchedule);
        return prev.filter(d => d !== day);
      }
      return [...prev, day];
    });
  };

  const handleScheduleChange = (day: number, time: string) => {
    setStudySchedule(prev => ({ ...prev, [day]: time }));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast.success("Bem-vindo de volta!");
        
        // Redirect to user's community
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await redirectToUserCommunity(user.id);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: name,
              city: city,
              phone: whatsapp,
            },
          },
        });

        if (error) throw error;

        // If user was created successfully, update profile and add to CVA community
        if (data.user) {
          // Update profile with additional info
          await supabase
            .from("profiles")
            .update({
              city: city,
              phone: whatsapp,
              study_goals: studyGoals.length > 0 ? studyGoals : null,
              study_days: studyDays.length > 0 ? studyDays : null,
              study_schedule: Object.keys(studySchedule).length > 0 ? studySchedule : null,
            })
            .eq("id", data.user.id);

          // Find CVA community
          const { data: cvaComm } = await supabase
            .from("communities")
            .select("id")
            .ilike("name", "%CVA%")
            .limit(1)
            .single();

          if (cvaComm) {
            // Add user as member of CVA community
            await supabase
              .from("community_members")
              .insert({
                user_id: data.user.id,
                community_id: cvaComm.id,
              });

            // Set user role to guest
            await supabase
              .from("user_roles")
              .delete()
              .eq("user_id", data.user.id);
            
            await supabase
              .from("user_roles")
              .insert({
                user_id: data.user.id,
                role: "guest",
              });
          }
        }

        toast.success("Bem-vindo à CVA! Você já faz parte da comunidade.");
      }
    } catch (error: any) {
      if (error.message.includes("already registered")) {
        toast.error("Este email já está cadastrado. Tente fazer login.");
      } else if (error.message.includes("Invalid login credentials")) {
        toast.error("Email ou senha incorretos.");
      } else {
        toast.error(error.message || "Erro ao processar sua solicitação.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background transition-theme">
      <div className="fixed top-6 left-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="gap-2 transition-gentle"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="fixed top-6 right-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="transition-gentle"
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
      </div>

      <Card className="w-full max-w-2xl p-8 space-y-6 transition-gentle max-h-[90vh] overflow-y-auto">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-medium text-primary">Proskë</h1>
          <p className="text-muted-foreground">
            {isLogin
              ? "Bem-vindo de volta ao seu espaço de aprendizado"
              : "Crie sua conta e comece a aprender"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="transition-gentle"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Sua cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="transition-gentle"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="transition-gentle"
            />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp (com DDD) *</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={handleWhatsappChange}
                required
                className="transition-gentle"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Sua senha segura"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="transition-gentle"
            />
          </div>

          {!isLogin && (
            <>
              <div className="space-y-3 pt-2">
                <Label>Objetivo de estudo</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {STUDY_GOALS.map((goal) => (
                    <div key={goal} className="flex items-center space-x-2">
                      <Checkbox
                        id={goal}
                        checked={studyGoals.includes(goal)}
                        onCheckedChange={() => toggleStudyGoal(goal)}
                      />
                      <Label
                        htmlFor={goal}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {goal}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Dias da Semana que vai estudar</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {WEEK_DAYS.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={studyDays.includes(day.value)}
                        onCheckedChange={() => toggleStudyDay(day.value)}
                      />
                      <Label
                        htmlFor={`day-${day.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {studyDays.length > 0 && (
                <div className="space-y-3 pt-2">
                  <Label>Horário de estudo (opcional)</Label>
                  <div className="grid gap-3">
                    {studyDays.sort((a, b) => {
                      const order = [1, 2, 3, 4, 5, 6, 0];
                      return order.indexOf(a) - order.indexOf(b);
                    }).map((day) => {
                      const dayLabel = WEEK_DAYS.find(d => d.value === day)?.label;
                      return (
                        <div key={day} className="flex items-center gap-3">
                          <Label className="w-24 text-sm">{dayLabel}</Label>
                          <Input
                            type="time"
                            value={studySchedule[day] || ""}
                            onChange={(e) => handleScheduleChange(day, e.target.value)}
                            className="transition-gentle"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Processando..." : isLogin ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <div className="text-center text-sm">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline transition-gentle"
          >
            {isLogin
              ? "Não tem uma conta? Cadastre-se"
              : "Já tem uma conta? Entre"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
