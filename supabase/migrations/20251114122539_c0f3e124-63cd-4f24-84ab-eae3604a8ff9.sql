-- View para análise de LTV dos alunos
CREATE OR REPLACE VIEW student_ltv_analysis AS
SELECT 
  p.id as user_id,
  p.name as student_name,
  p.email,
  p.phone,
  p.city,
  ur.role as user_role,
  us.plan_id as current_plan_id,
  sp.name as current_plan_name,
  sp.price as current_plan_price,
  us.start_date as subscription_start_date,
  us.end_date as subscription_end_date,
  us.due_day,
  us.status as subscription_status,
  
  -- Calcular total já pago (pagamentos confirmados)
  COALESCE(
    (SELECT SUM(amount) 
     FROM payments 
     WHERE user_id = p.id 
     AND status = 'confirmed'
    ), 0
  ) as total_paid,
  
  -- Calcular total pendente
  COALESCE(
    (SELECT SUM(amount) 
     FROM payments 
     WHERE user_id = p.id 
     AND status = 'pending'
    ), 0
  ) as total_pending,
  
  -- Calcular número de meses de assinatura ativa
  CASE 
    WHEN us.status = 'active' AND us.end_date > NOW() THEN
      EXTRACT(EPOCH FROM (us.end_date - us.start_date)) / (30.44 * 86400)
    ELSE 0
  END as months_active,
  
  -- Projeção de receita para próximos 12 meses
  CASE 
    WHEN us.status = 'active' AND us.end_date > NOW() THEN
      sp.price * 12
    ELSE 0
  END as projected_12m_revenue,
  
  -- Calcular dias até próximo pagamento
  CASE 
    WHEN us.status = 'active' AND us.due_day IS NOT NULL THEN
      CASE 
        WHEN us.due_day >= EXTRACT(DAY FROM NOW()) THEN
          us.due_day - EXTRACT(DAY FROM NOW())
        ELSE
          (EXTRACT(DAY FROM (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')) - EXTRACT(DAY FROM NOW())) + us.due_day
      END
    ELSE NULL
  END as days_to_next_payment,
  
  -- LTV (Lifetime Value) = total já pago + projeção de 12 meses
  COALESCE(
    (SELECT SUM(amount) 
     FROM payments 
     WHERE user_id = p.id 
     AND status = 'confirmed'
    ), 0
  ) + (
    CASE 
      WHEN us.status = 'active' AND us.end_date > NOW() THEN
        sp.price * 12
      ELSE 0
    END
  ) as ltv,
  
  p.created_at as customer_since
  
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN user_subscriptions us ON us.user_id = p.id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE ur.role IN ('student', 'visitor')
ORDER BY ltv DESC;

-- Grant access to view
GRANT SELECT ON student_ltv_analysis TO authenticated;