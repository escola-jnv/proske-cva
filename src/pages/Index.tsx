import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
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
              onClick={() => navigate("/auth")}
              className="transition-gentle"
            >
              Entrar
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              className="transition-gentle bg-primary hover:bg-primary/90"
            >
              Começar
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 pt-20">
        <section className="container mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-5xl lg:text-6xl font-medium leading-tight">
                  Seu espaço de aprendizado está pronto
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Conecte-se com seus alunos de forma calma e próxima. 
                  Crie comunidades por assunto e mantenha conversas que inspiram.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="transition-gentle text-lg bg-primary hover:bg-primary/90"
                >
                  Criar minha comunidade
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="transition-gentle text-lg border-2"
                >
                  Participar como aluno
                </Button>
              </div>
              <p className="text-caption">
                Boa conversa começa com respeito e curiosidade.
              </p>
            </div>

            <div className="relative">
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={heroImage}
                  alt="Ambiente educacional sereno"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="text-center mb-16 space-y-4">
            <h3 className="text-3xl font-medium">Como funciona o Proskë</h3>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Uma plataforma pensada para conversas calmas e produtivas
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4 p-8 rounded-2xl bg-card border border-border transition-gentle hover:shadow-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl text-primary">👨‍🏫</span>
              </div>
              <h4 className="text-xl font-medium">Para Professores</h4>
              <p className="text-muted-foreground leading-relaxed">
                Crie grupos temáticos, compartilhe conhecimento e acompanhe 
                o desenvolvimento dos seus alunos em um ambiente organizado.
              </p>
            </div>

            <div className="space-y-4 p-8 rounded-2xl bg-card border border-border transition-gentle hover:shadow-lg">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-2xl text-accent">👩‍🎓</span>
              </div>
              <h4 className="text-xl font-medium">Para Alunos</h4>
              <p className="text-muted-foreground leading-relaxed">
                Participe de comunidades por assunto, tire dúvidas e colabore 
                com colegas em um espaço respeitoso e focado.
              </p>
            </div>

            <div className="space-y-4 p-8 rounded-2xl bg-card border border-border transition-gentle hover:shadow-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl text-primary">💬</span>
              </div>
              <h4 className="text-xl font-medium">Conversas Calmas</h4>
              <p className="text-muted-foreground leading-relaxed">
                Ritmo humano, sem pressa. Cada mensagem conta e o design 
                favorece a reflexão e o respeito mútuo.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl p-12 text-center space-y-6">
            <h3 className="text-3xl font-medium">Tudo pronto para aprender juntos</h3>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Junte-se a professores e alunos que valorizam a troca gentil e produtiva
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="transition-gentle text-lg bg-primary hover:bg-primary/90"
            >
              Começar agora
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center text-caption">
          <p>© 2024 Proskë. Um espaço de aprendizado gentil.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
