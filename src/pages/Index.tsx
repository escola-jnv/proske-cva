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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">CVA</h1>
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
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 pt-20">
        <section className="container mx-auto px-6 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-block px-4 py-2 bg-primary/10 rounded-full">
                  <span className="text-primary font-semibold">Comunidade dos Verdadeiros Adoradores</span>
                </div>
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  Unidos em <span className="text-primary">Adoração</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Aqui, a adoração vai além das músicas. É um estilo de vida, uma conexão profunda com o Criador 
                  e uma comunidade que busca viver em espírito e em verdade. Junte-se a milhares de adoradores 
                  que compartilham a mesma paixão por honrar a Deus em cada aspecto da vida.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="transition-gentle text-lg font-bold shadow-lg hover:shadow-xl"
                >
                  Fazer parte da Maior Comunidade de Adoração
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl ring-4 ring-primary/20">
                <img
                  src={heroImage}
                  alt="Comunidade CVA - Verdadeiros Adoradores"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-primary text-primary-foreground p-6 rounded-xl shadow-xl">
                <p className="text-3xl font-bold">+1000</p>
                <p className="text-sm">Adoradores Conectados</p>
              </div>
            </div>
          </div>
        </section>

        {/* Missão Section */}
        <section className="bg-secondary text-secondary-foreground py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-4xl font-bold">Nossa Missão</h2>
              <p className="text-xl leading-relaxed opacity-90">
                A CVA (Comunidade dos Verdadeiros Adoradores) existe para reunir corações que desejam 
                adorar a Deus em espírito e em verdade. Não somos apenas uma comunidade online, 
                somos uma família espiritual que se apoia, cresce junta e compartilha o amor genuíno 
                por Jesus Cristo.
              </p>
              <p className="text-lg leading-relaxed opacity-80">
                "Mas a hora vem, e agora é, em que os verdadeiros adoradores adorarão o Pai em espírito 
                e em verdade; porque o Pai procura a tais que assim o adorem." - João 4:23
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="text-center mb-16 space-y-4">
            <h3 className="text-4xl font-bold">O que você encontra na CVA</h3>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Uma comunidade viva, cheia de propósito e conexão genuína
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4 p-8 rounded-2xl bg-card border-2 border-border transition-gentle hover:border-primary hover:shadow-xl">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl">🙏</span>
              </div>
              <h4 className="text-2xl font-bold">Adoração Verdadeira</h4>
              <p className="text-muted-foreground leading-relaxed">
                Aprenda e cresça na arte da adoração genuína. Compartilhe experiências, 
                testemunhos e descubra novas formas de honrar a Deus através da música e da vida.
              </p>
            </div>

            <div className="space-y-4 p-8 rounded-2xl bg-card border-2 border-border transition-gentle hover:border-primary hover:shadow-xl">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl">💒</span>
              </div>
              <h4 className="text-2xl font-bold">Comunhão e Apoio</h4>
              <p className="text-muted-foreground leading-relaxed">
                Conecte-se com irmãos que compartilham a mesma fé. Participe de grupos de 
                oração, estudos bíblicos e eventos que fortalecem a comunhão cristã.
              </p>
            </div>

            <div className="space-y-4 p-8 rounded-2xl bg-card border-2 border-border transition-gentle hover:border-primary hover:shadow-xl">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl">📖</span>
              </div>
              <h4 className="text-2xl font-bold">Crescimento Espiritual</h4>
              <p className="text-muted-foreground leading-relaxed">
                Acesse conteúdos exclusivos, cursos e materiais que vão aprofundar sua 
                compreensão da Palavra e transformar sua jornada com Deus.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-12 lg:p-16 text-center space-y-8 shadow-2xl">
            <h3 className="text-4xl lg:text-5xl font-bold text-primary-foreground">
              Seu lugar está reservado
            </h3>
            <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
              Faça parte da maior comunidade de adoração do Brasil. Juntos, vamos 
              transformar vidas através da adoração verdadeira e do amor de Cristo.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="transition-gentle text-lg font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-xl hover:shadow-2xl"
            >
              Fazer parte da Maior Comunidade de Adoração
            </Button>
            <p className="text-sm text-primary-foreground/80">
              Cadastro gratuito • Acesso imediato à comunidade
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-secondary/30">
        <div className="container mx-auto px-6 text-center">
          <p className="text-muted-foreground">
            © 2024 CVA - Comunidade dos Verdadeiros Adoradores
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            "Adoração em espírito e em verdade"
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
