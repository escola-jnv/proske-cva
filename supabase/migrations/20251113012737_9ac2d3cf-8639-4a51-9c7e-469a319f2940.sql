-- Criar tabela para armazenar ordem customizada dos grupos no menu
CREATE TABLE IF NOT EXISTS user_menu_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL, -- 'group', 'course', 'community'
  item_id uuid NOT NULL,
  order_index integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- Enable RLS
ALTER TABLE user_menu_order ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own menu order"
  ON user_menu_order
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own menu order"
  ON user_menu_order
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own menu order"
  ON user_menu_order
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own menu order"
  ON user_menu_order
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_menu_order_updated_at
  BEFORE UPDATE ON user_menu_order
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();