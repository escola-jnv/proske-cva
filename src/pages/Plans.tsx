import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign } from "lucide-react";
import { toast } from "sonner";

type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  billing_frequency: string | null;
  monitoring_frequency: string | null;
  weekly_corrections_limit: number | null;
};

const Plans = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

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

      await fetchPlans();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <nav className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/communities")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-medium">Planos</h1>
            <p className="text-sm text-muted-foreground">
              Conheça nossos planos de assinatura
            </p>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
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
              {plans.map((plan) => (
                <Card key={plan.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {plan.name}
                      <Badge variant="secondary" className="ml-2">
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
                      {plan.monitoring_frequency && (
                        <div className="text-sm">
                          <span className="font-medium">Monitorias: </span>
                          <span className="text-muted-foreground">
                            {plan.monitoring_frequency === "weekly" ? "Semanais" :
                             plan.monitoring_frequency === "biweekly" ? "Quinzenais" :
                             plan.monitoring_frequency === "monthly" ? "Mensais" :
                             plan.monitoring_frequency}
                          </span>
                        </div>
                      )}
                      {plan.weekly_corrections_limit !== null && plan.weekly_corrections_limit > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Correções por semana: </span>
                          <span className="text-muted-foreground">
                            {plan.weekly_corrections_limit}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Plans;
