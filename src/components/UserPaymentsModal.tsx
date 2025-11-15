import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Phone, MapPin, Plus, Calendar, Pencil } from "lucide-react";
import { toast } from "sonner";

type Payment = {
  id: string;
  user_id: string;
  amount: number;
  amount_paid?: number;
  due_date: string;
  paid_at?: string;
  status: "pending" | "confirmed" | "overdue" | "cancelled";
  description?: string;
  community_id?: string;
  plan_id?: string;
  payment_method?: "boleto" | "pix" | "cartao" | "dinheiro" | "transferencia";
  fees?: number;
  created_by: string;
  user_name?: string;
  community_name?: string;
  plan_name?: string;
};

type UserData = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  avatar_url?: string | null;
};

type Plan = {
  id: string;
  name: string;
  price: number;
};

type UserPaymentsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  payments: Payment[];
  userActivePlan?: Plan | null;
  plans: Plan[];
  onCreatePayment: (payment: Omit<Payment, "id" | "created_by">) => Promise<void>;
  onUpdatePayment: (id: string, payment: Partial<Payment>) => Promise<void>;
  onGenerate12Months: (userId: string, planId: string) => Promise<void>;
};

export function UserPaymentsModal({
  open,
  onOpenChange,
  user,
  payments,
  userActivePlan,
  plans,
  onCreatePayment,
  onUpdatePayment,
  onGenerate12Months,
}: UserPaymentsModalProps) {
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    payment: Payment | null;
  }>({ open: false, payment: null });

  const [createDialog, setCreateDialog] = useState(false);
  const [formData, setFormData] = useState<any>({});

  if (!user) return null;

  const handleGenerate12Months = async () => {
    if (!userActivePlan) {
      toast.error("Usuário não possui plano ativo");
      return;
    }

    try {
      await onGenerate12Months(user.id, userActivePlan.id);
      toast.success("12 meses de cobranças criadas com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar cobranças");
    }
  };

  const handleCreatePayment = async () => {
    if (!formData.amount || !formData.due_date) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      await onCreatePayment({
        user_id: user.id,
        amount: parseFloat(formData.amount),
        amount_paid: formData.amount_paid ? parseFloat(formData.amount_paid) : undefined,
        due_date: formData.due_date,
        paid_at: formData.paid_at || undefined,
        status: formData.status || "pending",
        description: formData.description || undefined,
        plan_id: formData.plan_id || undefined,
        payment_method: formData.payment_method || undefined,
        fees: formData.fees ? parseFloat(formData.fees) : undefined,
      });
      toast.success("Cobrança criada com sucesso!");
      setCreateDialog(false);
      setFormData({});
    } catch (error) {
      toast.error("Erro ao criar cobrança");
    }
  };

  const handleUpdatePayment = async () => {
    if (!editDialog.payment) return;

    try {
      await onUpdatePayment(editDialog.payment.id, formData);
      toast.success("Cobrança atualizada com sucesso!");
      setEditDialog({ open: false, payment: null });
      setFormData({});
    } catch (error) {
      toast.error("Erro ao atualizar cobrança");
    }
  };

  const openEditDialog = (payment: Payment) => {
    setFormData({
      amount: payment.amount,
      amount_paid: payment.amount_paid,
      due_date: payment.due_date.split("T")[0],
      paid_at: payment.paid_at ? payment.paid_at.split("T")[0] : "",
      status: payment.status,
      description: payment.description,
      plan_id: payment.plan_id || "",
      payment_method: payment.payment_method,
      fees: payment.fees,
    });
    setEditDialog({ open: true, payment });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      pending: { label: "Pendente", variant: "outline" },
      confirmed: { label: "Confirmado", variant: "default" },
      overdue: { label: "Atrasado", variant: "destructive" },
      cancelled: { label: "Cancelado", variant: "secondary" },
    };
    
    const statusInfo = statusMap[status] || { label: status, variant: "secondary" };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cobranças do Aluno</DialogTitle>
            <DialogDescription>
              Visualize e gerencie todas as cobranças associadas a este aluno
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleGenerate12Months} disabled={!userActivePlan}>
                <Calendar className="mr-2 h-4 w-4" />
                Criar 12 Meses
              </Button>
              <Button onClick={() => setCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Cobrança
              </Button>
            </div>

            {/* User Info Card */}
            <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{user.name}</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {user.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                    )}
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{user.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

            {/* Payments Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">Valor Original</TableHead>
                    <TableHead className="text-right">Valor Pago</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Taxas</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        Nenhuma cobrança encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.due_date)}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>{payment.plan_name || "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.amount_paid ? formatCurrency(payment.amount_paid) : "-"}
                        </TableCell>
                        <TableCell className="capitalize">
                          {payment.payment_method || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.fees ? formatCurrency(payment.fees) : "-"}
                        </TableCell>
                        <TableCell>
                          {payment.paid_at ? formatDate(payment.paid_at) : "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {payment.description || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(payment)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Payment Dialog */}
      <Dialog open={createDialog} onOpenChange={(open) => {
        setCreateDialog(open);
        if (!open) setFormData({});
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Nova Cobrança</DialogTitle>
            <DialogDescription>Preencha os dados da cobrança</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Valor Original (R$) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="amount_paid">Valor Pago (R$)</Label>
                <Input
                  id="amount_paid"
                  type="number"
                  step="0.01"
                  value={formData.amount_paid || ""}
                  onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="plan_id">Plano</Label>
              <Select
                value={formData.plan_id || ""}
                onValueChange={(value) => setFormData({ ...formData, plan_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrency(plan.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="due_date">Data de Vencimento *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date || ""}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="paid_at">Data de Pagamento</Label>
                <Input
                  id="paid_at"
                  type="date"
                  value={formData.paid_at || ""}
                  onChange={(e) => setFormData({ ...formData, paid_at: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment_method">Método de Pagamento</Label>
                <Select
                  value={formData.payment_method || ""}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="fees">Taxas (R$)</Label>
                <Input
                  id="fees"
                  type="number"
                  step="0.01"
                  value={formData.fees || ""}
                  onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || "pending"}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label htmlFor="description">Observações</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePayment}>Criar Cobrança</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => {
        setEditDialog({ open, payment: null });
        if (!open) setFormData({});
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cobrança</DialogTitle>
            <DialogDescription>Atualize os dados da cobrança</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_amount">Valor Original (R$)</Label>
                <Input
                  id="edit_amount"
                  type="number"
                  step="0.01"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="edit_amount_paid">Valor Pago (R$)</Label>
                <Input
                  id="edit_amount_paid"
                  type="number"
                  step="0.01"
                  value={formData.amount_paid || ""}
                  onChange={(e) => setFormData({ ...formData, amount_paid: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_plan_id">Plano</Label>
              <Select
                value={formData.plan_id || ""}
                onValueChange={(value) => setFormData({ ...formData, plan_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrency(plan.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_due_date">Data de Vencimento</Label>
                <Input
                  id="edit_due_date"
                  type="date"
                  value={formData.due_date || ""}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_paid_at">Data de Pagamento</Label>
                <Input
                  id="edit_paid_at"
                  type="date"
                  value={formData.paid_at || ""}
                  onChange={(e) => setFormData({ ...formData, paid_at: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_payment_method">Método de Pagamento</Label>
                <Select
                  value={formData.payment_method || ""}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_fees">Taxas (R$)</Label>
                <Input
                  id="edit_fees"
                  type="number"
                  step="0.01"
                  value={formData.fees || ""}
                  onChange={(e) => setFormData({ ...formData, fees: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_status">Status</Label>
              <Select
                value={formData.status || ""}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label htmlFor="edit_description">Observações</Label>
              <Textarea
                id="edit_description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, payment: null })}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePayment}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
