-- Add fields to user_subscriptions for customization
ALTER TABLE user_subscriptions
ADD COLUMN custom_price numeric,
ADD COLUMN due_day integer CHECK (due_day >= 1 AND due_day <= 31);

COMMENT ON COLUMN user_subscriptions.custom_price IS 'Valor customizado da mensalidade para este usuário específico (sobrescreve o preço do plano)';
COMMENT ON COLUMN user_subscriptions.due_day IS 'Dia do mês para vencimento da mensalidade (1-31)';

-- Add weekly_submissions_limit to profiles
ALTER TABLE profiles
ADD COLUMN weekly_submissions_limit integer DEFAULT 0;

COMMENT ON COLUMN profiles.weekly_submissions_limit IS 'Quantidade de tarefas que o usuário pode enviar por semana (customizado por usuário)';