import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, Moon, Sun, Plus } from "lucide-react";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";

type Community = {
  id: string;
  name: string;
  description: string;
  subject: string;
  member_count?: number;
  message_count?: number;
};

type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
};

const Communities = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
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
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (!currentSession?.user) {
        navigate("/auth");
      } else {
        // Fetch profile and communities after auth change
        setTimeout(() => {
          fetchProfile(currentSession.user.id);
          fetchCommunities();
        }, 0);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (!currentSession?.user) {
        navigate("/auth");
      } else {
        fetchProfile(currentSession.user.id);
        fetchCommunities();
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from("communities")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get member counts for each community
      const communitiesWithCounts = await Promise.all(
        (data || []).map(async (community) => {
          const { count: memberCount } = await supabase
            .from("community_members")
            .select("*", { count: "exact", head: true })
            .eq("community_id", community.id);

          const { count: messageCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("community_id", community.id);

          return {
            ...community,
            member_count: memberCount || 0,
            message_count: messageCount || 0,
          };
        })
      );

      setCommunities(communitiesWithCounts);
    } catch (error: any) {
      console.error("Error fetching communities:", error);
      toast.error("Erro ao carregar comunidades");
    }
  };

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
              Bem-vindo, {profile?.name || user?.user_metadata?.name || "estudante"}
            </h2>
            <p className="text-xl text-muted-foreground">
              {communities.length > 0 
                ? "Suas comunidades de aprendizado"
                : "Nenhuma comunidade disponível ainda"}
            </p>
          </div>

          {/* Communities Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Real communities from database */}
            {communities.map((community) => {
              const subjectEmojis: Record<string, string> = {
                matemática: "📚",
                redação: "✍️",
                história: "🌍",
                ciências: "🔬",
                português: "📖",
                inglês: "🌐",
              };
              
              const emoji = subjectEmojis[community.subject.toLowerCase()] || "📚";
              
              return (
                <Card key={community.id} className="p-8 space-y-4 transition-gentle hover:shadow-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl">{emoji}</span>
                  </div>
                  <h3 className="text-xl font-medium">{community.name}</h3>
                  <p className="text-muted-foreground">
                    {community.description || "Uma comunidade de aprendizado"}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-caption">
                    <span>{community.member_count || 0} membros</span>
                    <span>•</span>
                    <span>{community.message_count || 0} mensagens</span>
                  </div>
                  <Button className="w-full transition-gentle bg-primary hover:bg-primary/90">
                    Entrar na conversa
                  </Button>
                </Card>
              );
            })}

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
