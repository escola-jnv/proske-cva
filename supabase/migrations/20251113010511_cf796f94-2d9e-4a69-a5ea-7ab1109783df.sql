-- Insert admin role for the current user
INSERT INTO user_roles (user_id, role) 
VALUES ('bfb1e05c-3132-418d-bf42-3039430a8307', 'admin')
ON CONFLICT DO NOTHING;