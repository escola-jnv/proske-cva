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
  const { inviteCode } = useParams();
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
    if (inviteCode) {
      fetchInviteData(inviteCode);
    }
  }, [inviteCode]);

  const fetchInviteData = async (code: string) => {
    try {
      setLoading(true);

      const { data: invitation, error: inviteError } = await supabase
        .from("community_invitations")
        .select(`
          id,
          community_id,
          invited_by,
          used_by,
          communities (
            id,
            name,
            subject,
            description,
            cover_image_url
          ),
          profiles!community_invitations_invited_by_fkey (
            name,
            avatar_url
          )
        `)
        .eq("invite_code", code)
        .single();

      if (inviteError || !invitation) {
        toast.error("Convite inválido ou expirado");
        navigate("/");
        return;
      }

      if (invitation.used_by) {
        toast.error("Este convite já foi utilizado");
        navigate("/");
        return;
      }

      setInviteData({
        community: Array.isArray(invitation.communities)
          ? invitation.communities[0]
          : invitation.communities,
        inviter: Array.isArray(invitation.profiles)
          ? invitation.profiles[0]
          : invitation.profiles,
        inviteId: invitation.id,
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

      // Mark invitation as used
      const { error: updateError } = await supabase
        .from("community_invitations")
        .update({
          used_by: user.id,
          used_at: new Date().toISOString(),
        })
        .eq("id", inviteData.inviteId);

      if (updateError) throw updateError;

      toast.success("Convite aceito com sucesso!");
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
          emailRedirectTo: `${window.location.origin}/invite/${inviteCode}`,
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
          bio: validated.city,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }

      // Mark invitation as used
      const { error: updateError } = await supabase
        .from("community_invitations")
        .update({
          used_by: authData.user.id,
          used_at: new Date().toISOString(),
        })
        .eq("id", inviteData?.inviteId);

      if (updateError) {
        console.error("Error updating invitation:", updateError);
      }

      toast.success("Conta criada com sucesso!");
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
