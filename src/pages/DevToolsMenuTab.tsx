import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GripVertical, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";

type MenuItem = {
  id: string;
  item_key: string;
  item_type: "link" | "separator" | "subtitle";
  label: string | null;
  icon: string | null;
  route: string | null;
  order_index: number;
  visible: boolean;
};

const iconOptions = [
  "gem", "file-text", "dollar-sign", "settings", "users", "book-open", 
  "calendar", "message-square", "graduation-cap", "home", "bell",
  "star", "heart", "trash-2", "edit", "plus", "minus", "x"
];

export default function DevToolsMenuTab() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    data: Partial<MenuItem> | null;
  }>({ open: false, mode: "create", data: null });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from("menu_configuration")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setMenuItems((data || []) as MenuItem[]);
    } catch (error: any) {
      console.error("Error fetching menu items:", error);
      toast.error("Erro ao carregar configuração do menu");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(menuItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order_index for all items
    const updatedItems = items.map((item, index) => ({
      ...item,
      order_index: index + 1
    }));

    setMenuItems(updatedItems);

    // Save to database
    try {
      const updates = updatedItems.map(item => ({
        id: item.id,
        order_index: item.order_index
      }));

      for (const update of updates) {
        await supabase
          .from("menu_configuration")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }

      toast.success("Ordem atualizada com sucesso!");
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast.error("Erro ao atualizar ordem");
      fetchMenuItems(); // Reload on error
    }
  };

  const handleSave = async () => {
    const { mode, data } = editDialog;
    if (!data) return;

    try {
      if (mode === "create") {
        const maxOrder = Math.max(...menuItems.map(i => i.order_index), 0);
        const { error } = await supabase
          .from("menu_configuration")
          .insert({
            item_key: data.item_key || `item_${Date.now()}`,
            item_type: data.item_type || "link",
            label: data.label,
            icon: data.icon,
            route: data.route,
            order_index: maxOrder + 1,
            visible: data.visible ?? true
          });

        if (error) throw error;
        toast.success("Item criado com sucesso!");
      } else {
        const { error } = await supabase
          .from("menu_configuration")
          .update({
            label: data.label,
            icon: data.icon,
            route: data.route,
            item_type: data.item_type,
            visible: data.visible
          })
          .eq("id", data.id);

        if (error) throw error;
        toast.success("Item atualizado com sucesso!");
      }

      setEditDialog({ open: false, mode: "create", data: null });
      fetchMenuItems();
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar item");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    try {
      const { error } = await supabase
        .from("menu_configuration")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Item excluído com sucesso!");
      fetchMenuItems();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error("Erro ao excluir item");
    }
  };

  const toggleVisibility = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from("menu_configuration")
        .update({ visible: !item.visible })
        .eq("id", item.id);

      if (error) throw error;
      toast.success("Visibilidade atualizada!");
      fetchMenuItems();
    } catch (error: any) {
      console.error("Error toggling visibility:", error);
      toast.error("Erro ao atualizar visibilidade");
    }
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return null;
    const pascalCase = iconName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    const IconComponent = (LucideIcons as any)[pascalCase];
    if (!IconComponent || typeof IconComponent !== 'function') return null;
    return <IconComponent className="h-4 w-4" />;
  };

  if (loading) return <div className="p-4">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium">Configuração do Menu</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie a ordem e os ícones do menu de navegação global
          </p>
        </div>
        <Button onClick={() => setEditDialog({ open: true, mode: "create", data: { item_type: "link", visible: true } })}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item
        </Button>
      </div>

      <Card className="p-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="menu-items">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {menuItems.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          snapshot.isDragging ? "bg-accent" : "bg-background"
                        } ${!item.visible ? "opacity-50" : ""}`}
                      >
                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>

                        {item.item_type === "link" && (
                          <>
                            <div className="flex items-center gap-2">
                              {getIcon(item.icon)}
                              <span className="font-medium">{item.label}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{item.route}</span>
                          </>
                        )}

                        {item.item_type === "separator" && (
                          <div className="flex-1 border-t-2 border-dashed" />
                        )}

                        {item.item_type === "subtitle" && (
                          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            {item.label}
                          </span>
                        )}

                        <div className="ml-auto flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleVisibility(item)}
                          >
                            {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditDialog({ open: true, mode: "edit", data: item })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, mode: "create", data: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.mode === "create" ? "Adicionar Item ao Menu" : "Editar Item do Menu"}
            </DialogTitle>
            <DialogDescription>
              Configure as propriedades do item do menu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="item-type">Tipo do Item</Label>
              <Select
                value={editDialog.data?.item_type || "link"}
                onValueChange={(value) => setEditDialog(prev => ({
                  ...prev,
                  data: { ...prev.data, item_type: value as "link" | "separator" | "subtitle" }
                }))}
              >
                <SelectTrigger id="item-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="separator">Separador</SelectItem>
                  <SelectItem value="subtitle">Subtítulo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editDialog.data?.item_type !== "separator" && (
              <div>
                <Label htmlFor="label">Texto</Label>
                <Input
                  id="label"
                  value={editDialog.data?.label || ""}
                  onChange={(e) => setEditDialog(prev => ({
                    ...prev,
                    data: { ...prev.data, label: e.target.value }
                  }))}
                  placeholder="Ex: Início"
                />
              </div>
            )}

            {editDialog.data?.item_type === "link" && (
              <>
                <div>
                  <Label htmlFor="icon">Ícone</Label>
                  <Select
                    value={editDialog.data?.icon || ""}
                    onValueChange={(value) => setEditDialog(prev => ({
                      ...prev,
                      data: { ...prev.data, icon: value }
                    }))}
                  >
                    <SelectTrigger id="icon">
                      <SelectValue placeholder="Selecione um ícone" />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map(icon => (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            {getIcon(icon)}
                            <span>{icon}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="route">Rota</Label>
                  <Input
                    id="route"
                    value={editDialog.data?.route || ""}
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      data: { ...prev.data, route: e.target.value }
                    }))}
                    placeholder="Ex: /tasks"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, mode: "create", data: null })}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
