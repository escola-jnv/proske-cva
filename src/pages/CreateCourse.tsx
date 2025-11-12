import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const courseSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().trim().optional(),
});

const CreateCourse = () => {
  const navigate = useNavigate();
  const { communityId } = useParams();
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = courseSchema.parse(form);
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar autenticado");
        return;
      }

      const { data, error } = await supabase
        .from("courses")
        .insert({
          community_id: communityId,
          name: validated.name,
          description: validated.description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Curso criado com sucesso!");
      navigate(`/courses/${data.id}/manage`);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Erro de validação");
      } else {
        toast.error("Erro ao criar curso: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <nav className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/communities/${communityId}/manage`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-medium">Criar Novo Curso</h1>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-12">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="flex items-center gap-3 mb-6">
            <GraduationCap className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-medium">Informações do Curso</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="course-name">Nome do curso</Label>
              <Input
                id="course-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Matemática Básica"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-description">Descrição (opcional)</Label>
              <Textarea
                id="course-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Descreva o curso e seus objetivos"
                rows={5}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/communities/${communityId}/manage`)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Criando..." : "Criar Curso"}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default CreateCourse;
