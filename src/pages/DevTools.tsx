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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";

type Profile = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  role?: string;
};

type Community = {
  id: string;
  name: string;
  description?: string;
  subject: string;
  created_by: string;
};

type Group = {
  id: string;
  name: string;
  description?: string;
  community_id: string;
  students_can_message: boolean;
  is_visible: boolean;
};

export default function DevTools() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    type: "profile" | "community" | "group" | null;
    data: any | null;
  }>({ open: false, type: null, data: null });

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

      setIsAdmin(true);
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
      const [profilesRes, communitiesRes, groupsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("name"),
        supabase.from("communities").select("*").order("name"),
        supabase.from("conversation_groups").select("*").order("name"),
      ]);

      // Fetch roles for each profile
      if (profilesRes.data) {
        const profilesWithRoles = await Promise.all(
          profilesRes.data.map(async (profile) => {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.id)
              .limit(1)
              .single();
            
            return {
              ...profile,
              role: roleData?.role || "student",
            };
          })
        );
        setProfiles(profilesWithRoles);
      }
      
      if (communitiesRes.data) setCommunities(communitiesRes.data);
      if (groupsRes.data) setGroups(groupsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type: "profile" | "community" | "group", data: any) => {
    setEditDialog({ open: true, type, data: { ...data } });
  };

  const handleSave = async () => {
    const { type, data } = editDialog;
    if (!type || !data) return;

    try {
      if (type === "profile") {
        // Update profile
        const { role, ...profileData } = data;
        const { error: profileError } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("id", data.id);

        if (profileError) throw profileError;

        // Update role
        if (role) {
          // Delete existing role
          await supabase.from("user_roles").delete().eq("user_id", data.id);
          
          // Insert new role
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({ user_id: data.id, role });

          if (roleError) throw roleError;
        }
      } else {
        let table: string = "";
        switch (type) {
          case "community":
            table = "communities";
            break;
          case "group":
            table = "conversation_groups";
            break;
        }

        const { error } = await supabase
          .from(table as any)
          .update(data)
          .eq("id", data.id);

        if (error) throw error;
      }

      toast.success("Atualizado com sucesso!");
      setEditDialog({ open: false, type: null, data: null });
      await fetchAllData();
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error(error.message || "Erro ao salvar");
    }
  };

  const handleDelete = async (type: "profile" | "community" | "group", id: string) => {
    if (!confirm("Tem certeza que deseja deletar este item?")) return;

    try {
      let table: string = "";
      switch (type) {
        case "profile":
          table = "profiles";
          break;
        case "community":
          table = "communities";
          break;
        case "group":
          table = "conversation_groups";
          break;
      }

      const { error } = await supabase.from(table as any).delete().eq("id", id);

      if (error) throw error;

      toast.success("Deletado com sucesso!");
      await fetchAllData();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error(error.message || "Erro ao deletar");
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ferramentas de Desenvolvimento</h1>
          <p className="text-muted-foreground">Visualize e edite dados do sistema</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/communities")}>
          Voltar
        </Button>
      </div>

      <Tabs defaultValue="profiles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profiles">Usuários ({profiles.length})</TabsTrigger>
          <TabsTrigger value="communities">Comunidades ({communities.length})</TabsTrigger>
          <TabsTrigger value="groups">Grupos ({groups.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários</CardTitle>
              <CardDescription>Visualize e edite perfis de usuários</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>{profile.name}</TableCell>
                      <TableCell>
                        {profile.role === "admin" && "Admin"}
                        {profile.role === "teacher" && "Professor"}
                        {profile.role === "student" && "Aluno"}
                      </TableCell>
                      <TableCell>{profile.phone || "-"}</TableCell>
                      <TableCell>{profile.bio || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit("profile", profile)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete("profile", profile.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comunidades</CardTitle>
              <CardDescription>Visualize e edite comunidades</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Matéria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communities.map((community) => (
                    <TableRow key={community.id}>
                      <TableCell>{community.name}</TableCell>
                      <TableCell>{community.subject}</TableCell>
                      <TableCell>{community.description || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit("community", community)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete("community", community.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grupos</CardTitle>
              <CardDescription>Visualize e edite grupos de conversa</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Alunos Podem Enviar</TableHead>
                    <TableHead>Visível</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>{group.name}</TableCell>
                      <TableCell>{group.description || "-"}</TableCell>
                      <TableCell>{group.students_can_message ? "Sim" : "Não"}</TableCell>
                      <TableCell>{group.is_visible ? "Sim" : "Não"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit("group", group)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete("group", group.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, type: null, data: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {editDialog.type === "profile" ? "Usuário" : editDialog.type === "community" ? "Comunidade" : "Grupo"}</DialogTitle>
            <DialogDescription>Faça as alterações necessárias</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {editDialog.type === "profile" && editDialog.data && (
              <>
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={editDialog.data.name || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), name: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Tipo de Usuário</Label>
                  <Select
                    value={editDialog.data.role || "student"}
                    onValueChange={(value) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), role: value } }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Aluno</SelectItem>
                      <SelectItem value="teacher">Professor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={editDialog.data.phone || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), phone: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Cidade</Label>
                  <Input
                    id="bio"
                    value={editDialog.data.bio || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), bio: e.target.value } }))}
                  />
                </div>
              </>
            )}

            {editDialog.type === "community" && editDialog.data && (
              <>
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={editDialog.data.name || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), name: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Matéria</Label>
                  <Input
                    id="subject"
                    value={editDialog.data.subject || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), subject: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={editDialog.data.description || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), description: e.target.value } }))}
                  />
                </div>
              </>
            )}

            {editDialog.type === "group" && editDialog.data && (
              <>
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={editDialog.data.name || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), name: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={editDialog.data.description || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), description: e.target.value } }))}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, type: null, data: null })}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
