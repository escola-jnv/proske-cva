import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, X, LogOut, CreditCard, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { MobileHeader } from "@/components/MobileHeader";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  phone: z.string().trim().regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, "Formato inválido. Use: (11) 99999-9999").optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
});

type Profile = {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  email: string | null;
};

type UserRole = "visitor" | "student" | "teacher" | "admin" | "guest" | null;

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", city: "" });
  const [errors, setErrors] = useState<{ name?: string; phone?: string; city?: string }>({});
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    
    await Promise.all([fetchProfile(user.id), fetchUserRole(user.id)]);
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
      setFormData({ 
        name: data.name || "", 
        phone: data.phone || "",
        city: data.city || ""
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Erro ao carregar perfil");
    }
  };

  const fetchUserRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      setUserRole(data?.role as UserRole || "student");
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    toast.success(`Tema ${newTheme === "light" ? "claro" : "escuro"} ativado`);
  };

  const handlePhoneChange = (value: string) => {
    let formatted = value.replace(/\D/g, "");
    if (formatted.length > 11) formatted = formatted.slice(0, 11);
    
    if (formatted.length >= 2) {
      formatted = `(${formatted.slice(0, 2)}) ${formatted.slice(2)}`;
    }
    if (formatted.length >= 10) {
      const areaCode = formatted.slice(0, 4);
      const rest = formatted.slice(5);
      if (rest.length === 8) {
        formatted = `${areaCode} ${rest.slice(0, 4)}-${rest.slice(4)}`;
      } else if (rest.length === 9) {
        formatted = `${areaCode} ${rest.slice(0, 5)}-${rest.slice(5)}`;
      }
    }
    
    setFormData({ ...formData, phone: formatted });
    if (errors.phone) setErrors({ ...errors, phone: undefined });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = profileSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: any = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          phone: formData.phone || null,
          city: formData.city || null,
        })
        .eq("id", profile?.id);

      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
      if (profile) {
        setProfile({ ...profile, ...formData });
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success("Foto atualizada!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile?.avatar_url) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, avatar_url: null });
      toast.success("Foto removida!");
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error("Erro ao remover foto");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Você saiu da conta");
  };

  const getRoleName = (role: UserRole) => {
    const roles = {
      visitor: "Visitante",
      student: "Aluno",
      teacher: "Professor",
      admin: "Administrador",
      guest: "Convidado"
    };
    return roles[role || "student"];
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      visitor: "outline",
      student: "default",
      teacher: "secondary",
      admin: "destructive",
      guest: "outline"
    };
    return variants[role || "student"];
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader title="Perfil" />
      
      <div className="container mx-auto px-4 pt-20 max-w-2xl space-y-6">
        {/* Avatar Section */}
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-primary/10">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-4xl">
                  {profile.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {profile.avatar_url && (
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                  onClick={handleRemoveAvatar}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <h2 className="text-2xl font-bold">{profile.name}</h2>
              <Badge variant={getRoleBadgeVariant(userRole)}>
                {getRoleName(userRole)}
              </Badge>
              {profile.email && (
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              )}
            </div>

            <label htmlFor="avatar-upload">
              <Button variant="outline" disabled={uploading} asChild>
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Enviando..." : "Alterar Foto"}
                </span>
              </Button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </label>
          </div>
        </Card>

        {/* Profile Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                placeholder="Seu nome completo"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(11) 99999-9999"
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => {
                  setFormData({ ...formData, city: e.target.value });
                  if (errors.city) setErrors({ ...errors, city: undefined });
                }}
                placeholder="Sua cidade"
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </Card>

        {/* Actions */}
        <Card className="p-4 space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => navigate("/plans")}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Gerenciar Assinatura
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={toggleTheme}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4 mr-2" />
            ) : (
              <Sun className="h-4 w-4 mr-2" />
            )}
            Alternar Tema
          </Button>

          <Button 
            variant="destructive" 
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair da Conta
          </Button>
        </Card>
      </div>
    </div>
  );
}