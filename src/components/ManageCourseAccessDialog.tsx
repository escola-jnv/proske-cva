import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Course = {
  id: string;
  name: string;
};

type ManageCourseAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName: string | null;
  courses: Course[];
  onSuccess: () => void;
};

export function ManageCourseAccessDialog({
  open,
  onOpenChange,
  userId,
  userName,
  courses,
  onSuccess,
}: ManageCourseAccessDialogProps) {
  const [courseId, setCourseId] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!userId || !courseId || !endDate) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("user_course_access" as any)
        .insert({
          user_id: userId,
          course_id: courseId,
          end_date: endDate,
          granted_by: user?.id,
        } as any);

      if (error) throw error;

      toast.success("Acesso ao curso concedido com sucesso!");
      setCourseId("");
      setEndDate("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error granting course access:", error);
      toast.error(error.message || "Erro ao conceder acesso ao curso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conceder Acesso ao Curso</DialogTitle>
          <DialogDescription>
            Concedendo acesso para {userName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="course">Curso</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o curso" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="end-date">Data de Expiração</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Conceder Acesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
