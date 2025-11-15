import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, Check, ClipboardList, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Student = {
  id: string;
  name: string;
  avatar_url?: string;
};

export function CreateAssignedTaskDialog({ communityId }: { communityId?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [deadline, setDeadline] = useState<Date>();
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .order("name");

      if (error) throw error;

      // Filter to only show students with student role
      const { data: studentRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      const studentIds = new Set(studentRoles?.map(r => r.user_id) || []);
      const filteredStudents = (data || []).filter(s => studentIds.has(s.id));
      
      setStudents(filteredStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchStudents();
    }
  };

  const toggleStudent = (student: Student) => {
    setSelectedStudents(prev => {
      const exists = prev.find(s => s.id === student.id);
      if (exists) {
        return prev.filter(s => s.id !== student.id);
      }
      return [...prev, student];
    });
  };

  const removeStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || selectedStudents.length === 0) {
      toast.error("Preencha o título, descrição e selecione pelo menos um aluno");
      return;
    }

    if (!communityId) {
      toast.error("ID da comunidade não encontrado");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Create assigned task
      const { data: assignedTask, error: taskError } = await supabase
        .from("assigned_tasks")
        .insert({
          created_by: user.id,
          community_id: communityId,
          title: title.trim(),
          description: description.trim(),
          youtube_url: youtubeUrl.trim() || null,
          pdf_url: pdfUrl.trim() || null,
          deadline: deadline || null,
        } as any)
        .select()
        .single();

      if (taskError) throw taskError;

      // Assign to students
      const studentAssignments = selectedStudents.map(student => ({
        assigned_task_id: assignedTask.id,
        student_id: student.id,
      }));

      const { error: assignError } = await supabase
        .from("assigned_task_students")
        .insert(studentAssignments);

      if (assignError) throw assignError;

      toast.success(`Tarefa atribuída para ${selectedStudents.length} aluno(s)`);
      
      // Reset form
      setTitle("");
      setDescription("");
      setYoutubeUrl("");
      setPdfUrl("");
      setDeadline(undefined);
      setSelectedStudents([]);
      setOpen(false);
    } catch (error: any) {
      console.error("Error creating assigned task:", error);
      toast.error("Erro ao criar tarefa");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button>
          <ClipboardList className="w-4 h-4 mr-2" />
          Criar Tarefa para Alunos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Tarefa para Alunos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Tarefa *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Prática de escalas maiores"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição do Exercício *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o exercício proposto..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="youtube">Link do YouTube (Opcional)</Label>
            <Input
              id="youtube"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdf">Link do PDF (Opcional)</Label>
            <Input
              id="pdf"
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Prazo Limite (Opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !deadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Alunos *</Label>
            <Popover open={studentsOpen} onOpenChange={setStudentsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedStudents.length > 0
                    ? `${selectedStudents.length} aluno(s) selecionado(s)`
                    : "Selecione os alunos"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Buscar aluno..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                    <CommandGroup>
                      {filteredStudents.map((student) => (
                        <CommandItem
                          key={student.id}
                          onSelect={() => toggleStudent(student)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedStudents.find(s => s.id === student.id)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {student.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedStudents.map((student) => (
                  <Badge key={student.id} variant="secondary">
                    {student.name}
                    <button
                      onClick={() => removeStudent(student.id)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={loading || !title.trim() || !description.trim() || selectedStudents.length === 0}
            className="w-full"
          >
            {loading ? "Criando..." : "Criar Tarefa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
