import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Users, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";
import { z } from "zod";

const groupSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  description: z.string().trim().max(500, "Descrição muito longa").optional(),
});

const inviteSchema = z.object({
  contact: z.string().trim().min(3, "Email ou telefone inválido"),
});

type Community = {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  created_by: string;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
};

const CommunityManagement = () => {
  const navigate = useNavigate();
  const { communityId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [inviteForm, setInviteForm] = useState({ contact: "" });
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        navigate("/auth");
      } else if (communityId) {
        fetchCommunityData(communityId, currentSession.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, communityId]);

  const fetchCommunityData = async (commId: string, userId: string) => {
    try {
      // Fetch community
      const { data: commData, error: commError } = await supabase
        .from("communities")
        .select("*")
        .eq("id", commId)
        .single();

      if (commError) throw commError;

      // Check if user is creator
      if (commData.created_by !== userId) {
        toast.error("Você não tem permissão para gerenciar esta comunidade");
        navigate("/communities");
        return;
      }

      setCommunity(commData);

      // Fetch groups
      await fetchGroups(commId);
    } catch (error: any) {
      console.error("Error fetching community:", error);
      toast.error("Erro ao carregar comunidade");
      navigate("/communities");
    }
  };

  const fetchGroups = async (commId: string) => {
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from("conversation_groups" as any)
        .select("*")
        .eq("community_id", commId)
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;

      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group: any) => {
          const { count } = await supabase
            .from("group_members" as any)
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);

          return {
            id: group.id,
            name: group.name,
            description: group.description,
            member_count: count || 0,
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = groupSchema.parse(groupForm);
      setCreating(true);

      const { error } = await supabase
        .from("conversation_groups" as any)
        .insert({
          community_id: communityId,
          name: validated.name,
          description: validated.description || null,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success("Grupo criado com sucesso!");
      setGroupForm({ name: "", description: "" });
      setCreateGroupOpen(false);
      if (communityId) fetchGroups(communityId);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Erro de validação");
      } else {
        toast.error("Erro ao criar grupo: " + error.message);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = inviteSchema.parse(inviteForm);
      setInviting(true);

      // Determine if it's email or phone
      const isEmail = validated.contact.includes("@");
      const isPhone = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(validated.contact);

      if (!isEmail && !isPhone) {
        toast.error("Por favor, insira um email válido ou telefone no formato (11) 99999-9999");
        return;
      }

      // Find user by email or phone
      let userId: string | null = null;

      if (isEmail) {
        // Find user by email in auth metadata or profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .limit(1000);

        // We can't directly query auth.users, so we'll need to match by asking user to search
        toast.error("Adicionar por email será implementado em breve. Use telefone por enquanto.");
        return;
      } else {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("phone", validated.contact)
          .single();
        userId = profileData?.id || null;
      }

      if (!userId) {
        toast.error("Usuário não encontrado com este email/telefone");
        return;
      }

      // Add user to group
      const { error } = await supabase
        .from("group_members" as any)
        .insert({
          group_id: selectedGroupId,
          user_id: userId,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Este usuário já faz parte do grupo");
        } else {
          throw error;
        }
      } else {
        toast.success("Convite enviado com sucesso!");
        setInviteForm({ contact: "" });
        setInviteDialogOpen(false);
        if (communityId) fetchGroups(communityId);
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Erro de validação");
      } else {
        toast.error("Erro ao enviar convite: " + error.message);
      }
    } finally {
      setInviting(false);
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
          <div>
            <h1 className="text-2xl font-medium">{community?.name}</h1>
            <p className="text-sm text-muted-foreground">{community?.subject}</p>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Community Info */}
          {community?.description && (
            <Card className="p-6">
              <p className="text-muted-foreground">{community.description}</p>
            </Card>
          )}

          {/* Groups Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-medium">Grupos de Conversa</h2>
              <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Grupo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Grupo</DialogTitle>
                    <DialogDescription>
                      Crie um grupo de conversa para os alunos
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-name">Nome do grupo</Label>
                      <Input
                        id="group-name"
                        value={groupForm.name}
                        onChange={(e) =>
                          setGroupForm({ ...groupForm, name: e.target.value })
                        }
                        placeholder="Ex: Turma 3A"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="group-description">Descrição (opcional)</Label>
                      <Textarea
                        id="group-description"
                        value={groupForm.description}
                        onChange={(e) =>
                          setGroupForm({ ...groupForm, description: e.target.value })
                        }
                        placeholder="Descreva o grupo"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateGroupOpen(false)}
                        disabled={creating}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={creating}>
                        {creating ? "Criando..." : "Criar Grupo"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Groups List */}
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((group) => (
                <Card key={group.id} className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-medium">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{group.member_count} membros</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setInviteDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Alunos
                  </Button>
                </Card>
              ))}

              {groups.length === 0 && (
                <Card className="p-12 col-span-2 flex flex-col items-center justify-center border-2 border-dashed">
                  <p className="text-muted-foreground text-center">
                    Nenhum grupo criado ainda. Crie o primeiro grupo!
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Alunos</DialogTitle>
            <DialogDescription>
              Adicione alunos ao grupo usando email ou telefone
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Email ou Telefone</Label>
              <Input
                id="contact"
                value={inviteForm.contact}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, contact: e.target.value })
                }
                placeholder="email@exemplo.com ou (11) 99999-9999"
              />
              <p className="text-xs text-muted-foreground">
                O aluno deve estar cadastrado no sistema
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
                disabled={inviting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunityManagement;
