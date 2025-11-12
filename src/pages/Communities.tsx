import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, Moon, Sun, Plus } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const Communities = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Até logo!");
      navigate("/");
    } catch (error: any) {
      toast.error("Erro ao sair: " + error.message);
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
    <div className="min-h-screen bg-background transition-theme">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-medium text-primary">Proskë</h1>
          <div className="flex items-center gap-4">
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
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="gap-2 transition-gentle"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="space-y-4">
            <h2 className="text-4xl font-medium">
              Bem-vindo, {user?.user_metadata?.name || "estudante"}
            </h2>
            <p className="text-xl text-muted-foreground">
              Suas comunidades de aprendizado
            </p>
          </div>

          {/* Communities Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Placeholder for future communities */}
            <Card className="p-8 space-y-4 transition-gentle hover:shadow-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
              <h3 className="text-xl font-medium">Matemática</h3>
              <p className="text-muted-foreground">
                Explore conceitos e resolva problemas com seus colegas
              </p>
              <div className="flex items-center gap-2 text-sm text-caption">
                <span>124 membros</span>
                <span>•</span>
                <span>15 mensagens hoje</span>
              </div>
              <Button className="w-full transition-gentle bg-primary hover:bg-primary/90">
                Entrar na conversa
              </Button>
            </Card>

            <Card className="p-8 space-y-4 transition-gentle hover:shadow-lg">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-2xl">✍️</span>
              </div>
              <h3 className="text-xl font-medium">Redação</h3>
              <p className="text-muted-foreground">
                Aprimore sua escrita com feedback gentil e construtivo
              </p>
              <div className="flex items-center gap-2 text-sm text-caption">
                <span>89 membros</span>
                <span>•</span>
                <span>8 mensagens hoje</span>
              </div>
              <Button className="w-full transition-gentle bg-primary hover:bg-primary/90">
                Entrar na conversa
              </Button>
            </Card>

            <Card className="p-8 space-y-4 transition-gentle hover:shadow-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl">🌍</span>
              </div>
              <h3 className="text-xl font-medium">História</h3>
              <p className="text-muted-foreground">
                Conecte passado e presente em discussões respeitosas
              </p>
              <div className="flex items-center gap-2 text-sm text-caption">
                <span>156 membros</span>
                <span>•</span>
                <span>22 mensagens hoje</span>
              </div>
              <Button className="w-full transition-gentle bg-primary hover:bg-primary/90">
                Entrar na conversa
              </Button>
            </Card>

            {/* Create New Community Card */}
            <Card className="p-8 flex flex-col items-center justify-center space-y-4 border-2 border-dashed transition-gentle hover:shadow-lg hover:border-primary/50">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-medium">Criar nova comunidade</h3>
                <p className="text-sm text-muted-foreground">
                  Crie um espaço de troca gentil e produtiva
                </p>
              </div>
              <Button variant="outline" className="transition-gentle">
                Em breve
              </Button>
            </Card>
          </div>

          {/* Info Box */}
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-none">
            <p className="text-center text-muted-foreground">
              💡 Lembre-se: Boa conversa começa com respeito e curiosidade
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Communities;
