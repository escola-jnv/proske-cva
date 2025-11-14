-- Função para verificar se a role do usuário está permitida no grupo
CREATE OR REPLACE FUNCTION public.can_access_group_by_role(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_groups g
    LEFT JOIN user_roles ur ON ur.user_id = _user_id
    WHERE g.id = _group_id
      AND (
        -- Se não há roles específicas definidas, todos podem acessar
        g.allowed_message_roles IS NULL
        OR g.allowed_message_roles = '{}'
        -- Ou se a role do usuário está na lista permitida
        OR ur.role::text = ANY(g.allowed_message_roles)
      )
  );
$$;

-- Atualizar policy de SELECT para messages
DROP POLICY IF EXISTS "Members and teachers can view group messages" ON messages;

CREATE POLICY "Users with allowed roles can view group messages"
ON messages
FOR SELECT
TO authenticated
USING (
  group_id IS NOT NULL AND (
    -- É membro explícito do grupo
    is_group_member(auth.uid(), group_id)
    -- É teacher ou admin
    OR has_role(auth.uid(), 'teacher'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    -- Ou tem uma role permitida pelo grupo
    OR can_access_group_by_role(auth.uid(), group_id)
  )
);

-- Atualizar policy de INSERT para messages
DROP POLICY IF EXISTS "Members and teachers can send group messages" ON messages;

CREATE POLICY "Users with allowed roles can send group messages"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  group_id IS NOT NULL AND (
    -- É membro explícito do grupo
    is_group_member(auth.uid(), group_id)
    -- É teacher ou admin
    OR has_role(auth.uid(), 'teacher'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    -- Ou tem uma role permitida pelo grupo
    OR can_access_group_by_role(auth.uid(), group_id)
  )
);