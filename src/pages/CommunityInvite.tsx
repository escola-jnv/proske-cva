import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().regex(/^\(\d{2}\)\s?\d{5}-\d{4}$/, "Telefone inválido. Use o formato (11) 99999-9999"),
  city: z.string().trim().min(2, "Cidade é obrigatória"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type InviteData = {
  community: {
    id: string;
    name: string;
    subject: string;
    description: string | null;
    cover_image_url: string | null;
  };
  inviter: {
    name: string;
    avatar_url: string | null;
  };
  inviteId: string;
};

const CommunityInvite = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    password: "",
  });
  const [signingUp, setSigningUp] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (slug) {
      fetchInviteData(slug);
    }
  }, [slug]);

  const fetchInviteData = async (communitySlug: string) => {
    try {
      setLoading(true);

      // Fetch community by slug
      const { data: community, error: communityError } = await supabase
        .from("communities")
        .select(`
          id,
          name,
          subject,
          description,
          cover_image_url,
          created_by,
          profiles!communities_created_by_fkey (
            name,
            avatar_url
          )
        `)
        .eq("slug", communitySlug)
        .single();

      if (communityError || !community) {
        toast.error("Comunidade não encontrada");
        navigate("/");
        return;
      }

      setInviteData({
        community: {
          id: community.id,
          name: community.name,
          subject: community.subject,
          description: community.description,
          cover_image_url: community.cover_image_url,
        },
        inviter: Array.isArray(community.profiles)
          ? community.profiles[0]
          : community.profiles,
        inviteId: community.id,
      });
    } catch (error: any) {
      console.error("Error fetching invite:", error);
      toast.error("Erro ao carregar convite");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!user) {
      setShowSignup(true);
      return;
    }

    if (!inviteData) return;

    try {
      setAccepting(true);

      // Add user to community
      const { error: memberError } = await supabase
        .from("community_members")
        .insert({
          community_id: inviteData.community.id,
          user_id: user.id,
        });

      if (memberError) {
        // Check if user is already a member
        if (memberError.code === '23505') {
          toast.info("Você já é membro desta comunidade!");
          navigate("/communities");
          return;
        }
        throw memberError;
      }

      // Add user to all visible groups in the community
      const { data: visibleGroups, error: groupsError } = await supabase
        .from("conversation_groups")
        .select("id")
        .eq("community_id", inviteData.community.id)
        .eq("is_visible", true);

      if (groupsError) throw groupsError;

      if (visibleGroups && visibleGroups.length > 0) {
        const groupMemberships = visibleGroups.map(group => ({
          group_id: group.id,
          user_id: user.id
        }));

        const { error: groupMemberError } = await supabase
          .from("group_members")
          .insert(groupMemberships);

        if (groupMemberError && groupMemberError.code !== '23505') {
          throw groupMemberError;
        }
      }

      toast.success("Você entrou na comunidade e em todos os grupos visíveis!");
      navigate("/communities");
    } catch (error: any) {
      console.error("Error accepting invite:", error);
      toast.error("Erro ao aceitar convite: " + error.message);
    } finally {
      setAccepting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = signupSchema.parse(signupForm);
      setSigningUp(true);

      // Create account
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: {
            name: validated.name,
          },
          emailRedirectTo: `${window.location.origin}/communities`,
        },
      });

      if (signupError) throw signupError;

      if (!authData.user) {
        throw new Error("Erro ao criar conta");
      }

      // Update profile with additional info
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          phone: validated.phone,
          city: validated.city,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }

      // Add user to community
      const { error: memberError } = await supabase
        .from("community_members")
        .insert({
          community_id: inviteData?.community.id,
          user_id: authData.user.id,
        });

      if (memberError && memberError.code !== '23505') {
        throw memberError;
      }

      // Add user to all visible groups in the community
      const { data: visibleGroups, error: groupsError } = await supabase
        .from("conversation_groups")
        .select("id")
        .eq("community_id", inviteData?.community.id)
        .eq("is_visible", true);

      if (groupsError) throw groupsError;

      if (visibleGroups && visibleGroups.length > 0) {
        const groupMemberships = visibleGroups.map(group => ({
          group_id: group.id,
          user_id: authData.user.id
        }));

        const { error: groupMemberError } = await supabase
          .from("group_members")
          .insert(groupMemberships);

        if (groupMemberError && groupMemberError.code !== '23505') {
          throw groupMemberError;
        }
      }

      toast.success("Conta criada! Você já faz parte da comunidade e de todos os grupos visíveis.");
      navigate("/communities");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Erro de validação");
      } else {
        toast.error("Erro ao criar conta: " + error.message);
      }
    } finally {
      setSigningUp(false);
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
        <p className="text-muted-foreground">Carregando convite...</p>
      </div>
    );
  }

  if (!inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Convite não encontrado</p>
      </div>
    );
  }

  const subjectEmojis: Record<string, string> = {
    matemática: "📚",
    redação: "✍️",
    história: "🌍",
    ciências: "🔬",
    português: "📖",
    inglês: "🌐",
  };

  const emoji = subjectEmojis[inviteData.community.subject.toLowerCase()] || "📚";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full overflow-hidden">
        {/* Cover Image */}
        <div
          className="h-48 bg-cover bg-center relative"
          style={{
            backgroundImage: inviteData.community.cover_image_url
              ? `url(${inviteData.community.cover_image_url})`
              : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.6) 100%)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <span className="text-3xl">{emoji}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-medium">Você foi convidado!</h1>

            <div className="flex items-center justify-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={inviteData.inviter.avatar_url || ""}
                  alt={inviteData.inviter.name}
                />
                <AvatarFallback>
                  {getInitials(inviteData.inviter.name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-lg">
                  <span className="font-medium">{inviteData.inviter.name}</span> convidou você
                </p>
                <p className="text-sm text-muted-foreground">
                  para participar da comunidade
                </p>
              </div>
            </div>
          </div>

          <Card className="p-6 bg-muted/50 border-none space-y-3">
            <h2 className="text-2xl font-medium">{inviteData.community.name}</h2>
            <p className="text-muted-foreground">{inviteData.community.subject}</p>
            {inviteData.community.description && (
              <p className="text-sm text-muted-foreground">
                {inviteData.community.description}
              </p>
            )}
          </Card>

          <div className="space-y-3">
            {user ? (
              <>
                <Button
                  onClick={handleAcceptInvite}
                  disabled={accepting}
                  className="w-full"
                  size="lg"
                >
                  {accepting ? "Aceitando..." : "Aceitar Convite"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/communities")}
                  className="w-full"
                >
                  Ver Minhas Comunidades
                </Button>
              </>
            ) : !showSignup ? (
              <>
                <Button
                  onClick={handleAcceptInvite}
                  className="w-full"
                  size="lg"
                >
                  Criar Conta e Aceitar Convite
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="w-full"
                >
                  Já tenho conta
                </Button>
              </>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp com DDD</Label>
                  <Input
                    id="phone"
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={signupForm.city}
                    onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })}
                    placeholder="Sua cidade"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSignup(false)}
                    className="flex-1"
                    disabled={signingUp}
                  >
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={signingUp}>
                    {signingUp ? "Criando conta..." : "Criar Conta"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CommunityInvite;
