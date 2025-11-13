-- Adicionar admin ao grupo Bate-Papo
INSERT INTO group_members (user_id, group_id)
VALUES ('bfb1e05c-3132-418d-bf42-3039430a8307', '4a2ed383-de2a-4053-9ec3-f59c141f4557')
ON CONFLICT (user_id, group_id) DO NOTHING;