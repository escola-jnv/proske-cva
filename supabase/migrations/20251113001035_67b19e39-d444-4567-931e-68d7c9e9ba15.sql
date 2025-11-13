-- Adicionar campos à tabela subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN monitoring_frequency text,
ADD COLUMN weekly_corrections_limit integer DEFAULT 0;

-- Adicionar comentários para documentação
COMMENT ON COLUMN subscription_plans.monitoring_frequency IS 'Frequência de monitorias: weekly, biweekly, monthly, none';
COMMENT ON COLUMN subscription_plans.weekly_corrections_limit IS 'Quantidade máxima de correções que o aluno pode solicitar por semana';

-- Criar tabela para vincular planos com grupos padrão
CREATE TABLE plan_default_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES conversation_groups(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(plan_id, group_id)
);

-- Habilitar RLS
ALTER TABLE plan_default_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem gerenciar
CREATE POLICY "Admins can manage plan default groups"
ON plan_default_groups
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Policy: Usuários autenticados podem visualizar
CREATE POLICY "Anyone can view plan default groups"
ON plan_default_groups
FOR SELECT
TO authenticated
USING (true);