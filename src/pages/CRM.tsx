import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Settings, Search } from "lucide-react";
import { CRMKanban } from "@/components/crm/CRMKanban";
import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { ManageTagsDialog } from "@/components/crm/ManageTagsDialog";
import { MobileHeader } from "@/components/MobileHeader";
import { toast } from "sonner";

export default function CRM() {
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tags, refetch: refetchTags } = useQuery({
    queryKey: ["crm-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ["crm-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("name");

      if (profilesError) throw profilesError;

      // Get user tags separately
      const { data: userTags, error: tagsError } = await supabase
        .from("user_tags")
        .select(`
          user_id,
          tag_id,
          tags (*)
        `);

      if (tagsError) throw tagsError;

      // Combine data
      return profiles.map((profile) => ({
        ...profile,
        user_tags: userTags?.filter((ut) => ut.user_id === profile.id) || [],
      }));
    },
  });

  const { data: leads, refetch: refetchLeads } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_leads")
        .select(`
          *,
          lead_tags (
            tag_id,
            tags (*)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleRefetch = () => {
    refetchTags();
    refetchUsers();
    refetchLeads();
  };

  // Filter users and leads based on search query
  const filteredUsers = useMemo(() => {
    if (!users || !searchQuery) return users || [];
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query) ||
        user.city?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const filteredLeads = useMemo(() => {
    if (!leads || !searchQuery) return leads || [];
    const query = searchQuery.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.toLowerCase().includes(query) ||
        lead.city?.toLowerCase().includes(query)
    );
  }, [leads, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        title="CRM"
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsManageTagsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={() => setIsCreateLeadOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, telefone ou cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <CRMKanban
          tags={tags || []}
          users={filteredUsers}
          leads={filteredLeads}
          onRefetch={handleRefetch}
        />
      </div>

      <CreateLeadDialog
        open={isCreateLeadOpen}
        onOpenChange={setIsCreateLeadOpen}
        onSuccess={() => {
          refetchLeads();
          toast.success("Lead criado com sucesso!");
        }}
        tags={tags || []}
      />

      <ManageTagsDialog
        open={isManageTagsOpen}
        onOpenChange={setIsManageTagsOpen}
        onSuccess={() => {
          refetchTags();
          toast.success("Tags atualizadas!");
        }}
      />
    </div>
  );
}
