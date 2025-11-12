-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'confirmed', 'overdue', 'cancelled');

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  status payment_status NOT NULL DEFAULT 'pending',
  description TEXT,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins and teachers can create payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (auth.uid() = created_by AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)));

CREATE POLICY "Admins and teachers can update payments"
  ON public.payments
  FOR UPDATE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete payments"
  ON public.payments
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for better performance
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_due_date ON public.payments(due_date);
CREATE INDEX idx_payments_status ON public.payments(status);