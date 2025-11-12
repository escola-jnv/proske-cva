import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Moon, Sun } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/communities");
      }
    });
  }, [navigate]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
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
        navigate("/communities");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/communities`,
            data: {
              name: name,
            },
          },
        });

        if (error) throw error;

        toast.success("Conta criada! Verifique seu email para confirmar.");
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

      <Card className="w-full max-w-md p-8 space-y-6 transition-gentle">
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
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Como você gostaria de ser chamado?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                className="transition-gentle"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
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

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="transition-gentle"
            />
            {!isLogin && (
              <p className="text-xs text-muted-foreground">
                Mínimo de 6 caracteres
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full transition-gentle bg-primary hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <div className="text-center text-sm">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline transition-gentle"
          >
            {isLogin
              ? "Não tem conta? Cadastre-se"
              : "Já tem conta? Faça login"}
          </button>
        </div>

        <p className="text-xs text-center text-caption">
          {isLogin
            ? "Seu grupo está ativo — participe com gentileza."
            : "Boa conversa começa com respeito e curiosidade."}
        </p>
      </Card>
    </div>
  );
};

export default Auth;
