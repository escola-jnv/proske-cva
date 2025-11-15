import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tags: Tag[];
}

export function CreateLeadDialog({
  open,
  onOpenChange,
  onSuccess,
  tags,
}: CreateLeadDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const createLeadMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Create lead
      const { data: lead, error: leadError } = await supabase
        .from("crm_leads")
        .insert({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          city: formData.city || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Add tags
      if (selectedTags.length > 0) {
        const { error: tagsError } = await supabase.from("lead_tags").insert(
          selectedTags.map((tagId) => ({
            lead_id: lead.id,
            tag_id: tagId,
          }))
        );

        if (tagsError) throw tagsError;
      }
    },
    onSuccess: () => {
      setFormData({ name: "", email: "", phone: "", city: "" });
      setSelectedTags([]);
      onSuccess();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao criar lead");
    },
  });

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Cidade"
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer"
                    style={
                      isSelected
                        ? {
                            backgroundColor: tag.color,
                            borderColor: tag.color,
                          }
                        : {
                            borderColor: tag.color,
                            color: tag.color,
                          }
                    }
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                    {isSelected && <X className="h-3 w-3 ml-1" />}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createLeadMutation.mutate()}
              disabled={!formData.name.trim() || createLeadMutation.isPending}
            >
              Criar Lead
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
