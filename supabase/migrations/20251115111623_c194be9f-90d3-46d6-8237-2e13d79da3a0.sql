-- Add new columns to payments table
ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS amount_paid numeric,
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('boleto', 'pix', 'cartao', 'dinheiro', 'transferencia')),
  ADD COLUMN IF NOT EXISTS fees numeric DEFAULT 0;

-- Add comment to clarify fields
COMMENT ON COLUMN payments.amount IS 'Valor original da cobrança';
COMMENT ON COLUMN payments.amount_paid IS 'Valor efetivamente pago';
COMMENT ON COLUMN payments.fees IS 'Taxas cobradas pela plataforma de pagamento';
COMMENT ON COLUMN payments.payment_method IS 'Método de pagamento utilizado';