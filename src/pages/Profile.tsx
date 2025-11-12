import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Moon, Sun, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  phone: z.string().trim().regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, "Formato inválido. Use: (11) 99999-9999").optional().or(z.literal("")),
});

type Profile = {
  id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type UserRole = {
  role: string;
};

type Community = {
  id: string;
  name: string;
  subject: string;
};

type ConversationGroup = {
  id: string;
  name: string;
  community_name: string;
};

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string>("student");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [groups, setGroups] = useState<ConversationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        navigate("/auth");
      } else {
        setTimeout(() => {
          fetchUserData(currentSession.user.id);
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        navigate("/auth");
      } else {
        fetchUserData(currentSession.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    try {
      await Promise.all([
        fetchProfile(userId),
        fetchUserRole(userId),
        fetchUserCommunities(userId),
        fetchUserGroups(userId),
      ]);
    } catch (error) {
      console.error("Error fetching user data:", error);
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
      setFormData({ name: data.name || "", phone: data.phone || "" });
      setAvatarUrl(data.avatar_url);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    }
  };

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

  const fetchUserCommunities = async (userId: string) => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", userId);

      if (memberError) throw memberError;

      const communityIds = memberData?.map((m: any) => m.community_id) || [];

      if (communityIds.length === 0) {
        setCommunities([]);
        return;
      }

      const { data: communitiesData, error: communitiesError } = await supabase
        .from("communities")
        .select("id, name, subject")
        .in("id", communityIds);

      if (communitiesError) throw communitiesError;
      setCommunities(communitiesData || []);
    } catch (error: any) {
      console.error("Error fetching communities:", error);
    }
  };

  const fetchUserGroups = async (userId: string) => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);

      if (memberError) throw memberError;

      const groupIds = memberData?.map((m: any) => m.group_id) || [];

      if (groupIds.length === 0) {
        setGroups([]);
        return;
      }

      const { data: groupsData, error: groupsError } = await supabase
        .from("conversation_groups")
        .select(`
          id,
          name,
          communities:community_id (name)
        `)
        .in("id", groupIds);

      if (groupsError) throw groupsError;

      const formattedGroups = (groupsData || []).map((group: any) => ({
        id: group.id,
        name: group.name,
        community_name: Array.isArray(group.communities)
          ? group.communities[0]?.name
          : group.communities?.name || "",
      }));

      setGroups(formattedGroups);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handlePhoneChange = (value: string) => {
    let cleaned = value.replace(/\D/g, "");
    
    if (cleaned.length > 11) {
      cleaned = cleaned.slice(0, 11);
    }
    
    let formatted = cleaned;
    if (cleaned.length >= 2) {
      formatted = `(${cleaned.slice(0, 2)})`;
      if (cleaned.length > 2) {
        formatted += ` ${cleaned.slice(2, cleaned.length > 10 ? 7 : 6)}`;
        if (cleaned.length > (cleaned.length > 10 ? 6 : 6)) {
          formatted += `-${cleaned.slice(cleaned.length > 10 ? 7 : 6)}`;
        }
      }
    }
    
    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = profileSchema.parse(formData);
      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          name: validated.name,
          phone: validated.phone || null,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
      if (profile) {
        setProfile({ ...profile, name: validated.name, phone: validated.phone || null });
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { name?: string; phone?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as "name" | "phone"] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error("Por favor, corrija os erros no formulário");
      } else {
        toast.error("Erro ao atualizar perfil: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      student: "Estudante",
      teacher: "Professor",
      admin: "Administrador",
    };
    return roleNames[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      student: "default",
      teacher: "secondary",
      admin: "destructive",
    };
    return variants[role] || "outline";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione uma imagem");
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Imagem muito grande. Máximo 2MB");
        return;
      }

      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}/${Math.random()}.${fileExt}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split("/").slice(-2).join("/");
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user?.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      if (profile) {
        setProfile({ ...profile, avatar_url: publicUrl });
      }
      toast.success("Foto atualizada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      if (!profile?.avatar_url) return;

      setUploading(true);

      // Delete from storage
      const filePath = profile.avatar_url.split("/").slice(-2).join("/");
      await supabase.storage.from("avatars").remove([filePath]);

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user?.id);

      if (error) throw error;

      setAvatarUrl(null);
      if (profile) {
        setProfile({ ...profile, avatar_url: null });
      }
      toast.success("Foto removida com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao remover foto: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
      <header className="border-b border-border bg-card">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/communities")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-medium text-primary">Meu Perfil</h1>
          </div>
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
        </nav>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Form */}
          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-medium">Informações Pessoais</h2>
                  <Badge variant={getRoleBadgeVariant(userRole)}>
                    {getRoleName(userRole)}
                  </Badge>
                </div>

                {/* Avatar Upload */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarUrl || ""} alt={formData.name} />
                    <AvatarFallback className="text-2xl">
                      {formData.name ? getInitials(formData.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploading}
                          asChild
                        >
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading ? "Enviando..." : "Alterar foto"}
                          </span>
                        </Button>
                      </div>
                    </Label>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        disabled={uploading}
                        className="w-fit gap-2"
                      >
                        <X className="h-4 w-4" />
                        Remover foto
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG ou WEBP. Máx 2MB.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Seu nome"
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (com DDD)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={saving} className="w-full gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </form>
          </Card>

          {/* Communities */}
          <Card className="p-8 space-y-4">
            <h2 className="text-2xl font-medium">Minhas Comunidades</h2>
            {communities.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {communities.map((community) => (
                  <div
                    key={community.id}
                    className="p-4 rounded-lg bg-muted/50 space-y-1"
                  >
                    <h3 className="font-medium">{community.name}</h3>
                    <p className="text-sm text-muted-foreground">{community.subject}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Você ainda não faz parte de nenhuma comunidade
              </p>
            )}
          </Card>

          {/* Groups */}
          <Card className="p-8 space-y-4">
            <h2 className="text-2xl font-medium">Meus Grupos</h2>
            {groups.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="p-4 rounded-lg bg-muted/50 space-y-1"
                  >
                    <h3 className="font-medium">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {group.community_name}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Você ainda não faz parte de nenhum grupo
              </p>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
