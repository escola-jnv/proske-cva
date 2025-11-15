import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, 
  Search, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Users
} from "lucide-react";

type StudentLTV = {
  user_id: string;
  student_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  user_role: string;
  current_plan_name: string | null;
  current_plan_price: number | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  subscription_status: string | null;
  total_paid: number;
  total_pending: number;
  months_active: number;
  projected_12m_revenue: number;
  days_to_next_payment: number | null;
  ltv: number;
  customer_since: string;
};

type StudentLTVAnalysisProps = {
  onSelectUser?: (userId: string) => void;
};

export function StudentLTVAnalysis({ onSelectUser }: StudentLTVAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentLTV[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLTVData();
  }, []);

  const fetchLTVData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("student_ltv_analysis" as any)
        .select("*");

      if (error) throw error;

      setStudents((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching LTV data:", error);
      toast.error("Erro ao carregar dados de LTV");
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on search
  const filteredStudents = students.filter((s) =>
    s.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate summary statistics
  const totalLTV = students.reduce((sum, s) => sum + Number(s.ltv), 0);
  const totalPaid = students.reduce((sum, s) => sum + Number(s.total_paid), 0);
  const totalProjected = students.reduce((sum, s) => sum + Number(s.projected_12m_revenue), 0);
  const activeStudents = students.filter(s => s.subscription_status === 'active').length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      student: { label: "Aluno", variant: "default" },
      visitor: { label: "Visitante", variant: "outline" },
    };
    
    const roleInfo = roleMap[role] || { label: role, variant: "secondary" };
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>;
  };

  const getPaymentDaysBadge = (days: number | null) => {
    if (days === null) return <span className="text-muted-foreground">-</span>;
    
    if (days <= 3) {
      return <Badge variant="destructive">{days} dias</Badge>;
    } else if (days <= 7) {
      return <Badge className="bg-orange-500">{days} dias</Badge>;
    } else {
      return <Badge variant="secondary">{days} dias</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTV Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalLTV)}</div>
            <p className="text-xs text-muted-foreground">
              Valor total + projeção 12 meses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Faturado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              Pagamentos confirmados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projeção 12 Meses</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalProjected)}</div>
            <p className="text-xs text-muted-foreground">
              Receita prevista
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudents}</div>
            <p className="text-xs text-muted-foreground">
              De {students.length} cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de LTV por Aluno</CardTitle>
          <CardDescription>
            Acompanhe o valor já faturado e projeções de cada aluno
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Faturado</TableHead>
                  <TableHead className="text-right">Projeção 12m</TableHead>
                  <TableHead className="text-right">LTV</TableHead>
                  <TableHead className="text-center">Próx. Pgto</TableHead>
                  <TableHead>Cliente desde</TableHead>
                  {onSelectUser && <TableHead className="text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      {searchTerm ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.user_id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{student.student_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {getRoleBadge(student.user_role)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{student.email || "-"}</div>
                          <div className="text-muted-foreground">{student.phone || "-"}</div>
                          <div className="text-muted-foreground">{student.city || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{student.current_plan_name || "-"}</div>
                          <div className="text-muted-foreground">
                            {student.current_plan_price 
                              ? formatCurrency(Number(student.current_plan_price)) + "/mês"
                              : "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.subscription_status === 'active' ? (
                          <Badge variant="default">Ativo</Badge>
                        ) : (
                          <Badge variant="outline">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(student.total_paid))}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(Number(student.projected_12m_revenue))}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(Number(student.ltv))}
                      </TableCell>
                      <TableCell className="text-center">
                        {getPaymentDaysBadge(student.days_to_next_payment)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(student.customer_since)}
                      </TableCell>
                      {onSelectUser && (
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectUser(student.user_id)}
                          >
                            Ver Cobranças
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
