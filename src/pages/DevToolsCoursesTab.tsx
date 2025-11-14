import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Search, Plus, Users } from "lucide-react";

type Course = {
  id: string;
  name: string;
  description?: string;
  community_id: string;
  cover_image_url?: string;
  price?: number;
  checkout_url?: string;
  is_visible: boolean;
  created_by: string;
};

type UserCourseAccess = {
  id: string;
  user_id: string;
  course_id: string;
  course_name?: string;
  user_name?: string;
  start_date: string;
  end_date: string;
  granted_by: string;
};

type DevToolsCoursesTabProps = {
  courses: Course[];
  courseAccess: UserCourseAccess[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onEdit: (type: "course", data: Course) => void;
  onDelete: (type: "course" | "course_access", id: string) => void;
  onManageAccess: (userId: string, userName: string) => void;
  onCreateCourse: () => void;
};

export function DevToolsCoursesTab({
  courses,
  courseAccess,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete,
  onManageAccess,
  onCreateCourse,
}: DevToolsCoursesTabProps) {
  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAccess = courseAccess.filter((a) =>
    a.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.course_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Courses Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cursos</CardTitle>
              <CardDescription>Gerencie cursos e seus preços</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cursos..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button onClick={onCreateCourse}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Curso
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Visível</TableHead>
                <TableHead>Link de Checkout</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum curso encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{course.name}</p>
                        {course.description && (
                          <p className="text-sm text-muted-foreground">{course.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {course.price ? (
                        <Badge variant="secondary" className="font-mono">
                          R$ {course.price.toFixed(2)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={course.is_visible ? "default" : "secondary"}>
                        {course.is_visible ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {course.checkout_url ? (
                        <a
                          href={course.checkout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Ver link
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit("course", course)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete("course", course.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Course Access Management */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Acessos aos Cursos</CardTitle>
            <CardDescription>Gerencie quem tem acesso a cada curso</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Data de Início</TableHead>
                <TableHead>Data de Expiração</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccess.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum acesso concedido
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccess.map((access) => {
                  const isExpired = new Date(access.end_date) < new Date();
                  return (
                    <TableRow key={access.id}>
                      <TableCell>
                        <p className="font-medium">{access.user_name || "Usuário desconhecido"}</p>
                      </TableCell>
                      <TableCell>{access.course_name || "Curso desconhecido"}</TableCell>
                      <TableCell>
                        {new Date(access.start_date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {new Date(access.end_date).toLocaleDateString("pt-BR")}
                          {isExpired && (
                            <Badge variant="destructive" className="text-xs">
                              Expirado
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete("course_access", access.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
