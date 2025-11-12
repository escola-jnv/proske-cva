import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Loader2, 
  Pencil, 
  Trash2, 
  Search, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus 
} from "lucide-react";

type Payment = {
  id: string;
  user_id: string;
  amount: number;
  due_date: string;
  paid_at?: string;
  status: "pending" | "confirmed" | "overdue" | "cancelled";
  description?: string;
  community_id?: string;
  created_by: string;
  user_name?: string;
  community_name?: string;
};

type Profile = {
  id: string;
  name: string;
};

type Community = {
  id: string;
  name: string;
};

export default function Financial() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    data: any | null;
  }>({ open: false, data: null });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const admin = roles?.some((r) => r.role === "admin");
      
      if (!admin) {
        toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
        navigate("/communities");
        return;
      }

      await fetchAllData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao verificar permissões");
      navigate("/communities");
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, profilesRes, communitiesRes] = await Promise.all([
        supabase.from("payments").select("*").order("due_date", { ascending: false }),
        supabase.from("profiles").select("id, name").order("name"),
        supabase.from("communities").select("id, name").order("name"),
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data);
      if (communitiesRes.data) setCommunities(communitiesRes.data);
      
      // Fetch payments with user and community names
      if (paymentsRes.data) {
        const paymentsWithDetails = await Promise.all(
          paymentsRes.data.map(async (payment) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", payment.user_id)
              .single();
            
            let communityName = null;
            if (payment.community_id) {
              const { data: community } = await supabase
                .from("communities")
                .select("name")
                .eq("id", payment.community_id)
                .single();
              communityName = community?.name;
            }
            
            return {
              ...payment,
              user_name: profile?.name,
              community_name: communityName,
            };
          })
        );
        setPayments(paymentsWithDetails);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditDialog({ open: true, data: { ...payment } });
  };

  const handleCreatePayment = () => {
    setEditDialog({
      open: true,
      data: {
        user_id: "",
        amount: 0,
        due_date: new Date().toISOString().split("T")[0],
        status: "pending",
        description: "",
        community_id: "",
      },
    });
  };

  const handleSave = async () => {
    const { data } = editDialog;
    if (!data) return;

    try {
      if (!data.id) {
        // Create new payment
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("payments")
          .insert({
            ...data,
            created_by: user!.id,
          });

        if (error) throw error;
      } else {
        // Update existing
        const { error } = await supabase
          .from("payments")
          .update(data)
          .eq("id", data.id);

        if (error) throw error;
      }

      toast.success("Salvo com sucesso!");
      setEditDialog({ open: false, data: null });
      await fetchAllData();
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error(error.message || "Erro ao salvar");
    }
  };

  const handleDelete = (id: string) => {
    setDeleteDialog({ open: true, id });
  };

  const confirmDelete = async () => {
    const { id } = deleteDialog;
    if (!id) return;

    try {
      const { error } = await supabase.from("payments").delete().eq("id", id);

      if (error) throw error;

      toast.success("Pagamento deletado com sucesso!");
      setDeleteDialog({ open: false, id: null });
      await fetchAllData();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error(error.message || "Erro ao deletar");
    }
  };

  // Filter payments based on search
  const filteredPayments = payments.filter((p) =>
    p.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate financial statistics
  const totalReceivable = payments
    .filter(p => p.status !== "cancelled")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const confirmedTotal = payments
    .filter(p => p.status === "confirmed")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const pendingTotal = payments
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const overdueTotal = payments
    .filter(p => p.status === "overdue")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const confirmedCount = payments.filter(p => p.status === "confirmed").length;
  const pendingCount = payments.filter(p => p.status === "pending").length;
  const overdueCount = payments.filter(p => p.status === "overdue").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestão Financeira</h1>
      </div>

      {/* Financial Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {confirmedTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{confirmedCount} pagamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              R$ {pendingTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pendingCount} pagamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {overdueTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{overdueCount} pagamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projeção</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {(pendingTotal + confirmedTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pendentes + Confirmados</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pagamentos</CardTitle>
              <CardDescription>Gerencie todos os pagamentos</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pagamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button onClick={handleCreatePayment}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Pagamento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Comunidade</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum pagamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.user_name || "-"}</TableCell>
                    <TableCell className="font-semibold">
                      R$ {Number(payment.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {new Date(payment.due_date).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        payment.status === "confirmed" ? "default" :
                        payment.status === "pending" ? "secondary" :
                        payment.status === "overdue" ? "destructive" :
                        "outline"
                      }>
                        {payment.status === "confirmed" && "Confirmado"}
                        {payment.status === "pending" && "Pendente"}
                        {payment.status === "overdue" && "Atrasado"}
                        {payment.status === "cancelled" && "Cancelado"}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.community_name || "-"}</TableCell>
                    <TableCell>{payment.description || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(payment)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(payment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, data: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editDialog.data?.id ? "Editar Pagamento" : "Novo Pagamento"}
            </DialogTitle>
            <DialogDescription>Faça as alterações necessárias</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="user_id">Usuário</Label>
              <Select
                value={editDialog.data?.user_id || ""}
                onValueChange={(value) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), user_id: value } }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o usuário" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={editDialog.data?.amount || 0}
                onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), amount: parseFloat(e.target.value) } }))}
              />
            </div>
            <div>
              <Label htmlFor="due_date">Data de Vencimento</Label>
              <Input
                id="due_date"
                type="date"
                value={editDialog.data?.due_date?.split("T")[0] || ""}
                onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), due_date: e.target.value } }))}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={editDialog.data?.status || "pending"}
                onValueChange={(value) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), status: value } }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="community_id">Comunidade (Opcional)</Label>
              <Select
                value={editDialog.data?.community_id || ""}
                onValueChange={(value) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), community_id: value } }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a comunidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {communities.map((community) => (
                    <SelectItem key={community.id} value={community.id}>
                      {community.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea
                id="description"
                value={editDialog.data?.description || ""}
                onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), description: e.target.value } }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, data: null })}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este pagamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialog({ open: false, id: null })}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
