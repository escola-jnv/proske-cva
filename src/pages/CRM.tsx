import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import { CRMKanban } from "@/components/crm/CRMKanban";
import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { ManageTagsDialog } from "@/components/crm/ManageTagsDialog";
import { toast } from "sonner";

export default function CRM() {
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">CRM</h1>
            <p className="text-muted-foreground">Gerencie leads e alunos</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsManageTagsOpen(true)} variant="outline">
              <Settings className="h-4 w-4" />
              Gerenciar Tags
            </Button>
            <Button onClick={() => setIsCreateLeadOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo Lead
            </Button>
          </div>
        </div>

        <CRMKanban
          tags={tags || []}
          users={users || []}
          leads={leads || []}
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
