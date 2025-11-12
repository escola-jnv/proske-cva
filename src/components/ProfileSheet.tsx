import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Save, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
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

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function ProfileSheet({ open, onOpenChange, user }: ProfileSheetProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string>("student");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [groups, setGroups] = useState<ConversationGroup[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id && open) {
      fetchUserData(user.id);
    }
  }, [user?.id, open]);

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
        .from("community_members" as any)
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
        .from("group_members" as any)
        .select("group_id")
        .eq("user_id", userId);

      if (memberError) throw memberError;

      const groupIds = memberData?.map((m: any) => m.group_id) || [];

      if (groupIds.length === 0) {
        setGroups([]);
        return;
      }

      const { data: groupsData, error: groupsError } = await supabase
        .from("conversation_groups" as any)
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione uma imagem");
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Imagem muito grande. Máximo 2MB");
        return;
      }

      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}/${Math.random()}.${fileExt}`;

      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split("/").slice(-2).join("/");
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

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

      const filePath = profile.avatar_url.split("/").slice(-2).join("/");
      await supabase.storage.from("avatars").remove([filePath]);

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Meu Perfil</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Informações Pessoais</h3>
                <Badge variant={getRoleBadgeVariant(userRole)}>
                  {getRoleName(userRole)}
                </Badge>
              </div>

              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || ""} alt={formData.name} />
                  <AvatarFallback className="text-2xl">
                    {formData.name ? getInitials(formData.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2 items-center">
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
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
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Remover foto
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
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

          {/* Communities */}
          <Card className="p-4 space-y-3">
            <h3 className="font-medium">Minhas Comunidades</h3>
            {communities.length > 0 ? (
              <div className="space-y-2">
                {communities.map((community) => (
                  <div
                    key={community.id}
                    className="p-3 rounded-lg bg-muted/50 space-y-1"
                  >
                    <h4 className="font-medium text-sm">{community.name}</h4>
                    <p className="text-xs text-muted-foreground">{community.subject}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Você ainda não faz parte de nenhuma comunidade
              </p>
            )}
          </Card>

          {/* Groups */}
          <Card className="p-4 space-y-3">
            <h3 className="font-medium">Meus Grupos</h3>
            {groups.length > 0 ? (
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="p-3 rounded-lg bg-muted/50 space-y-1"
                  >
                    <h4 className="font-medium text-sm">{group.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {group.community_name}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Você ainda não faz parte de nenhum grupo
              </p>
            )}
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
