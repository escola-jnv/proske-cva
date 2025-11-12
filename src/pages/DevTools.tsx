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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2, Users, FolderOpen, MessageSquare, Calendar, Search, Upload, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type Profile = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
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

type Event = {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  duration_minutes: number;
  community_id: string;
  created_by: string;
};

export default function DevTools() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    type: "profile" | "community" | "group" | "event" | null;
    data: any | null;
  }>({ open: false, type: null, data: null });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "profile" | "community" | "group" | "event" | null;
    id: string | null;
  }>({ open: false, type: null, id: null });

  const [importLoading, setImportLoading] = useState(false);
  const [usersCSV, setUsersCSV] = useState("");
  const [lessonsCSV, setLessonsCSV] = useState("");

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
      const [profilesRes, communitiesRes, groupsRes, eventsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("name"),
        supabase.from("communities").select("*").order("name"),
        supabase.from("conversation_groups").select("*").order("name"),
        supabase.from("events").select("*").order("event_date", { ascending: false }),
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
      if (eventsRes.data) setEvents(eventsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type: "profile" | "community" | "group" | "event", data: any) => {
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
          case "event":
            table = "events";
            break;
        }

        // Update existing
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

  const handleDelete = (type: "profile" | "community" | "group" | "event", id: string) => {
    setDeleteDialog({ open: true, type, id });
  };

  const confirmDelete = async () => {
    const { type, id } = deleteDialog;
    if (!type || !id) return;

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
        case "event":
          table = "events";
          break;
      }

      const { error } = await supabase.from(table as any).delete().eq("id", id);

      if (error) throw error;

      toast.success("Deletado com sucesso!");
      setDeleteDialog({ open: false, type: null, id: null });
      await fetchAllData();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error(error.message || "Erro ao deletar");
    }
  };

  // Filter data based on search
  const filteredProfiles = profiles.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredCommunities = communities.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const parseCSV = (csv: string): string[][] => {
    const lines = csv.trim().split('\n');
    return lines.map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    });
  };

  const handleImportUsers = async () => {
    if (!usersCSV.trim()) {
      toast.error("Por favor, cole o conteúdo do CSV de usuários");
      return;
    }

    setImportLoading(true);
    try {
      const rows = parseCSV(usersCSV);
      const headers = rows[0].map(h => h.toLowerCase());
      
      // Validate headers
      const requiredHeaders = ['name', 'email', 'role'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(', ')}`);
        setImportLoading(false);
        return;
      }

      let imported = 0;
      let errors = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2 || !row[0]) continue; // Skip empty rows

        const userData: any = {};
        headers.forEach((header, index) => {
          userData[header] = row[index] || null;
        });

        try {
          // Create auth user
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: Math.random().toString(36).slice(-8) + 'A1!', // Random password
            email_confirm: true,
            user_metadata: {
              name: userData.name
            }
          });

          if (authError) throw authError;

          // Profile is created automatically via trigger
          // Update additional profile fields
          if (authData.user) {
            await supabase
              .from("profiles")
              .update({
                phone: userData.phone || null,
                city: userData.city || null,
                bio: userData.bio || null
              })
              .eq("id", authData.user.id);

            // Add role
            const role = userData.role?.toLowerCase() || 'student';
            if (['admin', 'teacher', 'student'].includes(role)) {
              await supabase
                .from("user_roles")
                .delete()
                .eq("user_id", authData.user.id);
                
              await supabase
                .from("user_roles")
                .insert({ user_id: authData.user.id, role });
            }
          }

          imported++;
        } catch (error: any) {
          console.error(`Erro ao importar linha ${i + 1}:`, error);
          errors++;
        }
      }

      toast.success(`${imported} usuários importados com sucesso!${errors > 0 ? ` ${errors} erros.` : ''}`);
      setUsersCSV("");
      await fetchAllData();
    } catch (error: any) {
      console.error("Error importing users:", error);
      toast.error(error.message || "Erro ao importar usuários");
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportLessons = async () => {
    if (!lessonsCSV.trim()) {
      toast.error("Por favor, cole o conteúdo do CSV de aulas");
      return;
    }

    setImportLoading(true);
    try {
      const rows = parseCSV(lessonsCSV);
      const headers = rows[0].map(h => h.toLowerCase());
      
      // Validate headers
      const requiredHeaders = ['name', 'module_id', 'youtube_url'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(', ')}`);
        setImportLoading(false);
        return;
      }

      let imported = 0;
      let errors = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2 || !row[0]) continue; // Skip empty rows

        const lessonData: any = {};
        headers.forEach((header, index) => {
          lessonData[header] = row[index] || null;
        });

        try {
          const { error } = await supabase
            .from("course_lessons")
            .insert({
              name: lessonData.name,
              description: lessonData.description || null,
              youtube_url: lessonData.youtube_url,
              module_id: lessonData.module_id,
              duration_minutes: lessonData.duration_minutes ? parseInt(lessonData.duration_minutes) : null,
              order_index: lessonData.order_index ? parseInt(lessonData.order_index) : 0
            });

          if (error) throw error;
          imported++;
        } catch (error: any) {
          console.error(`Erro ao importar linha ${i + 1}:`, error);
          errors++;
        }
      }

      toast.success(`${imported} aulas importadas com sucesso!${errors > 0 ? ` ${errors} erros.` : ''}`);
      setLessonsCSV("");
    } catch (error: any) {
      console.error("Error importing lessons:", error);
      toast.error(error.message || "Erro ao importar aulas");
    } finally {
      setImportLoading(false);
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

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comunidades</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{communities.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profiles" className="space-y-4" onValueChange={() => setSearchTerm("")}>
        <TabsList>
          <TabsTrigger value="profiles">Usuários</TabsTrigger>
          <TabsTrigger value="communities">Comunidades</TabsTrigger>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="import">Importação CSV</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usuários</CardTitle>
                  <CardDescription>Visualize e edite perfis de usuários</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuários..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
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
                  {filteredProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.name}</TableCell>
                        <TableCell>
                          <Badge variant={
                            profile.role === "admin" ? "default" : 
                            profile.role === "teacher" ? "secondary" : 
                            "outline"
                          }>
                            {profile.role === "admin" && "Admin"}
                            {profile.role === "teacher" && "Professor"}
                            {profile.role === "student" && "Aluno"}
                          </Badge>
                        </TableCell>
                        <TableCell>{profile.phone || "-"}</TableCell>
                        <TableCell>{profile.city || "-"}</TableCell>
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
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communities" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Comunidades</CardTitle>
                  <CardDescription>Visualize e edite comunidades</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar comunidades..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
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
                  {filteredCommunities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhuma comunidade encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCommunities.map((community) => (
                      <TableRow key={community.id}>
                        <TableCell className="font-medium">{community.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{community.subject}</Badge>
                        </TableCell>
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
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Grupos</CardTitle>
                  <CardDescription>Visualize e edite grupos de conversa</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar grupos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
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
                  {filteredGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum grupo encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGroups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{group.description || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={group.students_can_message ? "default" : "outline"}>
                            {group.students_can_message ? "Sim" : "Não"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={group.is_visible ? "default" : "outline"}>
                            {group.is_visible ? "Sim" : "Não"}
                          </Badge>
                        </TableCell>
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
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Eventos</CardTitle>
                  <CardDescription>Visualize e edite eventos</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar eventos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum evento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>
                          {new Date(event.event_date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.duration_minutes} min</Badge>
                        </TableCell>
                        <TableCell>{event.description || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit("event", event)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete("event", event.id)}
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
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Importar Usuários
                </CardTitle>
                <CardDescription>
                  Cole o conteúdo do CSV com os usuários. Formato: name,email,role,phone,city
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="usersCSV">Conteúdo do CSV</Label>
                  <Textarea
                    id="usersCSV"
                    value={usersCSV}
                    onChange={(e) => setUsersCSV(e.target.value)}
                    placeholder="name,email,role,phone,city&#10;João Silva,joao@example.com,student,11999999999,São Paulo&#10;Maria Santos,maria@example.com,teacher,11888888888,Rio de Janeiro"
                    className="font-mono text-sm min-h-[200px]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-semibold mb-1">Campos obrigatórios:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">name</code> - Nome do usuário</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">email</code> - Email (único)</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">role</code> - Tipo: student, teacher ou admin</li>
                    </ul>
                    <p className="font-semibold mt-2 mb-1">Campos opcionais:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">phone</code> - Telefone</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">city</code> - Cidade</li>
                    </ul>
                  </div>
                </div>
                <Button 
                  onClick={handleImportUsers} 
                  disabled={importLoading || !usersCSV.trim()}
                  className="w-full"
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Importar Usuários
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Importar Aulas
                </CardTitle>
                <CardDescription>
                  Cole o conteúdo do CSV com as aulas. Formato: name,module_id,youtube_url,description,duration_minutes,order_index
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="lessonsCSV">Conteúdo do CSV</Label>
                  <Textarea
                    id="lessonsCSV"
                    value={lessonsCSV}
                    onChange={(e) => setLessonsCSV(e.target.value)}
                    placeholder="name,module_id,youtube_url,description,duration_minutes,order_index&#10;Aula 1,uuid-do-modulo,https://youtube.com/watch?v=abc,Introdução,45,1&#10;Aula 2,uuid-do-modulo,https://youtube.com/watch?v=def,Conceitos,60,2"
                    className="font-mono text-sm min-h-[200px]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-semibold mb-1">Campos obrigatórios:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">name</code> - Nome da aula</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">module_id</code> - UUID do módulo</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">youtube_url</code> - URL do vídeo</li>
                    </ul>
                    <p className="font-semibold mt-2 mb-1">Campos opcionais:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">description</code> - Descrição</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">duration_minutes</code> - Duração em minutos</li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">order_index</code> - Ordem (padrão: 0)</li>
                    </ul>
                  </div>
                </div>
                <Button 
                  onClick={handleImportLessons} 
                  disabled={importLoading || !lessonsCSV.trim()}
                  className="w-full"
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Importar Aulas
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, type: null, data: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editDialog.data?.id 
                ? `Editar ${
                    editDialog.type === "profile" ? "Usuário" : 
                    editDialog.type === "community" ? "Comunidade" : 
                    editDialog.type === "group" ? "Grupo" : 
                    "Evento"
                  }`
                : "Criar Novo"
              }
            </DialogTitle>
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
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={editDialog.data.city || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), city: e.target.value } }))}
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

            {editDialog.type === "event" && editDialog.data && (
              <>
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={editDialog.data.title || ""}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), title: e.target.value } }))}
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
                <div>
                  <Label htmlFor="duration_minutes">Duração (minutos)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={editDialog.data.duration_minutes || 60}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, data: { ...(prev.data || {}), duration_minutes: parseInt(e.target.value) } }))}
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

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: null, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente este{" "}
              {deleteDialog.type === "profile" ? "usuário" :
               deleteDialog.type === "community" ? "comunidade" :
               deleteDialog.type === "group" ? "grupo" : 
               "evento"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
