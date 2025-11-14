-- Create table for global menu configuration
CREATE TABLE IF NOT EXISTS public.menu_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key text NOT NULL UNIQUE,
  item_type text NOT NULL, -- 'link', 'separator', 'subtitle'
  label text,
  icon text,
  route text,
  order_index integer NOT NULL,
  parent_key text,
  visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_configuration ENABLE ROW LEVEL SECURITY;

-- Anyone can read menu configuration
CREATE POLICY "Anyone can view menu configuration"
ON public.menu_configuration
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify menu configuration
CREATE POLICY "Admins can manage menu configuration"
ON public.menu_configuration
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_menu_configuration_updated_at
  BEFORE UPDATE ON public.menu_configuration
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default menu items
INSERT INTO public.menu_configuration (item_key, item_type, label, icon, route, order_index, visible) VALUES
  ('plans', 'link', 'Assinatura', 'gem', '/plans', 1, true),
  ('separator_1', 'separator', NULL, NULL, NULL, 2, true),
  ('subtitle_communities', 'subtitle', 'Comunidades', NULL, NULL, 3, true),
  ('tasks', 'link', 'Tarefas', 'file-text', '/tasks', 4, true),
  ('separator_2', 'separator', NULL, NULL, NULL, 5, true),
  ('subtitle_admin', 'subtitle', 'Admin', NULL, NULL, 6, true),
  ('financial', 'link', 'Financeiro', 'dollar-sign', '/financial', 7, true),
  ('devtools', 'link', 'DevTools', 'settings', '/dev-tools', 8, true)
ON CONFLICT (item_key) DO NOTHING;