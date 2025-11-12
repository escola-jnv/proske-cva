import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autorização ausente" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create authenticated client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("User authenticated:", user.id);

    const { communityId } = await req.json();

    if (!communityId) {
      return new Response(
        JSON.stringify({ error: "ID da comunidade é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user is the creator or has teacher/admin role
    const { data: community, error: communityError } = await supabaseClient
      .from("communities")
      .select("created_by")
      .eq("id", communityId)
      .single();

    if (communityError || !community) {
      console.error("Community error:", communityError);
      return new Response(
        JSON.stringify({ error: "Comunidade não encontrada" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has permission
    const { data: userRoles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasPermission =
      community.created_by === user.id ||
      userRoles?.some((r: any) => r.role === "teacher" || r.role === "admin");

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para gerar convites" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate unique invite code
    const inviteCode = crypto.randomUUID().split("-")[0];

    // Save invitation
    const { data: invitation, error: inviteError } = await supabaseClient
      .from("community_invitations")
      .insert({
        community_id: communityId,
        invited_by: user.id,
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Invite creation error:", inviteError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar convite" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Invite created successfully:", invitation);

    return new Response(
      JSON.stringify({ inviteCode }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
