-- Insert default user if not exists
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000000',
    'admin@example.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@example.com'
);

-- Insert default knowledge base if not exists
INSERT INTO knowledge_bases (id, name, user_id, status)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'Default Knowledge Base',
    '00000000-0000-0000-0000-000000000000',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM knowledge_bases WHERE name = 'Default Knowledge Base'
);
