import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Smartphone, Share } from "lucide-react";
import { useEffect, useState } from "react";

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("App instalado com sucesso");
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src="/icon-192.png" 
              alt="CVA Logo" 
              className="w-24 h-24 rounded-2xl shadow-lg"
            />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground">
            Instale o App CVA
          </h1>
          
          <p className="text-muted-foreground">
            Acesse a plataforma diretamente da tela inicial do seu celular
          </p>
        </div>

        {isInstallable ? (
          <div className="space-y-4">
            <Button 
              onClick={handleInstallClick}
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              Instalar Agora
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-foreground">iOS (iPhone/iPad)</h3>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Abra o site no Safari</li>
                    <li>Toque no ícone de compartilhar <Share className="inline h-4 w-4" /></li>
                    <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
                    <li>Toque em "Adicionar"</li>
                  </ol>
                </div>
              </div>

              <div className="flex items-start gap-4 pt-4 border-t border-border">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-foreground">Android</h3>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Abra o site no Chrome</li>
                    <li>Toque no menu (3 pontos) no canto superior</li>
                    <li>Toque em "Instalar app" ou "Adicionar à tela inicial"</li>
                    <li>Confirme tocando em "Instalar"</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Após instalado, o app funcionará offline e você receberá notificações
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
