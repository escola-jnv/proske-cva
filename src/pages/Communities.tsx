import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, Moon, Sun, Plus, User as UserIcon, Link as LinkIcon, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";
import { ProfileSheet } from "@/components/ProfileSheet";
import { CreateCommunityDialog } from "@/components/CreateCommunityDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";

type ConversationGroup = {
  id: string;
  name: string;
  description: string;
  community_id: string;
  community?: {
    name: string;
    subject: string;
  };
  member_count?: number;
  message_count?: number;
};

type MyCommunity = {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  cover_image_url: string | null;
  group_count: number;
  student_count: number;
  message_count: number;
};

type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
};

const editCommunitySchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  description: z.string().trim().max(500, "Descrição muito longa").optional(),
  subject: z.string().trim().min(2, "Matéria é obrigatória").max(100),
});

const Communities = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<ConversationGroup[]>([]);
  const [myCommunities, setMyCommunities] = useState<MyCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("student");
  const [generatingInvite, setGeneratingInvite] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<MyCommunity | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", subject: "", cover_image_url: "" });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (!currentSession?.user) {
        navigate("/auth");
      } else {
        // Fetch profile and groups after auth change
        setTimeout(() => {
          fetchProfile(currentSession.user.id);
          fetchUserRole(currentSession.user.id);
          fetchUserGroups();
          fetchMyCommunities(currentSession.user.id);
        }, 0);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (!currentSession?.user) {
        navigate("/auth");
      } else {
        fetchProfile(currentSession.user.id);
        fetchUserRole(currentSession.user.id);
        fetchUserGroups();
        fetchMyCommunities(currentSession.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      setUserRole(data?.role || "student");
    } catch (error: any) {
      console.error("Error fetching role:", error);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchUserGroups = async () => {
    try {
      if (!user?.id) return;

      // Get groups where the user is a member
      const { data: membershipData, error: membershipError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (membershipError) throw membershipError;

      const groupIds = membershipData?.map((m: any) => m.group_id) || [];

      if (groupIds.length === 0) {
        setGroups([]);
        return;
      }

      // Get group details with community info
      const { data: groupsData, error: groupsError } = await supabase
        .from("conversation_groups")
        .select(`
          *,
          communities:community_id (
            name,
            subject
          )
        `)
        .in("id", groupIds)
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;

      // Get member and message counts
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group: any) => {
          const { count: memberCount } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);

          const { count: messageCount } = await supabase
            .from("messages" as any)
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);

          return {
            id: group.id,
            name: group.name,
            description: group.description,
            community_id: group.community_id,
            community: Array.isArray(group.communities) 
              ? group.communities[0] 
              : group.communities,
            member_count: memberCount || 0,
            message_count: messageCount || 0,
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      toast.error("Erro ao carregar grupos");
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const fetchMyCommunities = async (userId: string) => {
    try {
      const { data: communitiesData, error } = await supabase
        .from("communities")
        .select("*")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const communitiesWithCounts = await Promise.all(
        (communitiesData || []).map(async (community) => {
          // Count groups
          const { count: groupCount } = await supabase
            .from("conversation_groups")
            .select("*", { count: "exact", head: true })
            .eq("community_id", community.id);

          // Get all group IDs for this community
          const { data: groupsData } = await supabase
            .from("conversation_groups")
            .select("id")
            .eq("community_id", community.id);

          const groupIds = groupsData?.map((g: any) => g.id) || [];

          let studentCount = 0;
          let messageCount = 0;

          if (groupIds.length > 0) {
            // Count unique students across all groups
            const { data: membersData } = await supabase
              .from("group_members")
              .select("user_id")
              .in("group_id", groupIds);

            const uniqueStudents = new Set(membersData?.map((m: any) => m.user_id) || []);
            studentCount = uniqueStudents.size;

            // Count total messages across all groups
            const { count: msgCount } = await supabase
              .from("messages" as any)
              .select("*", { count: "exact", head: true })
              .in("group_id", groupIds);

            messageCount = msgCount || 0;
          }

          return {
            id: community.id,
            name: community.name,
            subject: community.subject,
            description: community.description,
            cover_image_url: community.cover_image_url,
            group_count: groupCount || 0,
            student_count: studentCount,
            message_count: messageCount,
          };
        })
      );

      setMyCommunities(communitiesWithCounts);
    } catch (error: any) {
      console.error("Error fetching my communities:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Até logo!");
      navigate("/");
    } catch (error: any) {
      toast.error("Erro ao sair: " + error.message);
    }
  };

  const handleGenerateInvite = async (communityId: string) => {
    try {
      setGeneratingInvite(communityId);

      const { data, error } = await supabase.functions.invoke("generate-invite", {
        body: { communityId },
      });

      if (error) throw error;

      const inviteUrl = `${window.location.origin}/invite/${data.inviteCode}`;
      
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link copiado para área de transferência!");
    } catch (error: any) {
      console.error("Error generating invite:", error);
      toast.error("Erro ao gerar convite: " + error.message);
    } finally {
      setGeneratingInvite(null);
    }
  };

  const handleEditCommunity = (community: MyCommunity) => {
    setEditingCommunity(community);
    setEditForm({
      name: community.name,
      description: community.description || "",
      subject: community.subject,
      cover_image_url: community.cover_image_url || "",
    });
    setEditDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB");
      return;
    }

    try {
      setUploadingImage(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `community-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setEditForm({ ...editForm, cover_image_url: data.publicUrl });
      toast.success("Imagem carregada!");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCommunity) return;

    try {
      const validated = editCommunitySchema.parse(editForm);
      setUpdating(true);

      const { error } = await supabase
        .from("communities")
        .update({
          name: validated.name,
          description: validated.description || null,
          subject: validated.subject,
          cover_image_url: editForm.cover_image_url || null,
        })
        .eq("id", editingCommunity.id);

      if (error) throw error;

      toast.success("Comunidade atualizada!");
      setEditDialogOpen(false);
      if (user) fetchMyCommunities(user.id);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Erro de validação");
      } else {
        toast.error("Erro ao atualizar: " + error.message);
      }
    } finally {
      setUpdating(false);
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
    <div className="min-h-screen bg-background transition-theme">
      {/* Header */}
      <header className="border-b border-border bg-card">
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
              size="icon"
              onClick={() => setProfileSheetOpen(true)}
              className="transition-gentle p-0 rounded-full overflow-hidden"
            >
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.name}
                  className="h-10 w-10 object-cover"
                />
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="gap-2 transition-gentle"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <h2 className="text-4xl font-medium">
                Bem-vindo, {profile?.name || user?.user_metadata?.name || "estudante"}
              </h2>
              <p className="text-xl text-muted-foreground">
                {groups.length > 0 
                  ? "Seus grupos de conversa"
                  : "Você ainda não faz parte de nenhum grupo"}
              </p>
            </div>
            {(userRole === "teacher" || userRole === "admin") && user && (
              <CreateCommunityDialog
                userId={user.id}
                onCommunityCreated={() => {
                  fetchUserGroups();
                  fetchMyCommunities(user.id);
                }}
              />
            )}
          </div>

          {/* My Communities (for teachers/admins) */}
          {(userRole === "teacher" || userRole === "admin") && myCommunities.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl font-medium">Minhas Comunidades</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {myCommunities.map((community) => {
                  const subjectEmojis: Record<string, string> = {
                    matemática: "📚",
                    redação: "✍️",
                    história: "🌍",
                    ciências: "🔬",
                    português: "📖",
                    inglês: "🌐",
                  };
                  
                  const emoji = subjectEmojis[community.subject.toLowerCase()] || "📚";
                  
                  return (
                    <Card 
                      key={community.id} 
                      className="overflow-hidden transition-gentle hover:shadow-lg cursor-pointer relative"
                      onClick={() => navigate(`/communities/${community.id}/manage`)}
                    >
                      {/* Edit Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCommunity(community);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {/* Cover Image */}
                      <div 
                        className="h-32 bg-cover bg-center relative"
                        style={{ 
                          backgroundImage: community.cover_image_url 
                            ? `url(${community.cover_image_url})` 
                            : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.6) 100%)'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 left-3">
                          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                            <span className="text-xl">{emoji}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="p-6 space-y-4">
                        <div>
                          <h4 className="text-xl font-medium">{community.name}</h4>
                          <p className="text-sm text-muted-foreground">{community.subject}</p>
                        </div>
                        {community.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{community.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-caption">
                          <span>{community.student_count} alunos</span>
                          <span>•</span>
                          <span>{community.message_count} conversas</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateInvite(community.id);
                            }}
                            disabled={generatingInvite === community.id}
                          >
                            <LinkIcon className="h-4 w-4" />
                            {generatingInvite === community.id ? "Gerando..." : "Convidar"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Groups Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* User's conversation groups */}
            {groups.map((group) => {
              const subjectEmojis: Record<string, string> = {
                matemática: "📚",
                redação: "✍️",
                história: "🌍",
                ciências: "🔬",
                português: "📖",
                inglês: "🌐",
              };
              
              const emoji = subjectEmojis[group.community?.subject?.toLowerCase() || ""] || "💬";
              
              return (
                <Card key={group.id} className="p-8 space-y-4 transition-gentle hover:shadow-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl">{emoji}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium">{group.name}</h3>
                    {group.community && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.community.name}
                      </p>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {group.description || "Um grupo de aprendizado"}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-caption">
                    <span>{group.member_count || 0} membros</span>
                    <span>•</span>
                    <span>{group.message_count || 0} mensagens</span>
                  </div>
                  <Button className="w-full transition-gentle bg-primary hover:bg-primary/90">
                    Abrir conversa
                  </Button>
                </Card>
              );
            })}

          </div>

          {/* Info Box */}
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-none">
            <p className="text-center text-muted-foreground">
              💡 Lembre-se: Boa conversa começa com respeito e curiosidade
            </p>
          </Card>
        </div>
      </main>

      {/* Profile Sheet */}
      <ProfileSheet
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        user={user}
      />

      {/* Edit Community Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Comunidade</DialogTitle>
            <DialogDescription>
              Atualize as informações da sua comunidade
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateCommunity} className="space-y-4">
            {/* Cover Image Preview */}
            {editForm.cover_image_url && (
              <div className="relative w-full h-32 rounded-lg overflow-hidden">
                <img
                  src={editForm.cover_image_url}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="cover-image">Imagem de Capa</Label>
              <Input
                id="cover-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
              <p className="text-xs text-muted-foreground">
                {uploadingImage ? "Carregando..." : "PNG, JPG até 5MB"}
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="community-name">Nome da Comunidade</Label>
              <Input
                id="community-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Ex: Matemática 3º Ano"
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="community-subject">Matéria</Label>
              <Input
                id="community-subject"
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                placeholder="Ex: Matemática"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="community-description">Descrição (opcional)</Label>
              <Textarea
                id="community-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Descreva sua comunidade"
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={updating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updating || uploadingImage}>
                {updating ? "Atualizando..." : "Atualizar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Communities;
