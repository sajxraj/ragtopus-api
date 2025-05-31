-- Insert or update default user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'admin@ragtopus.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    updated_at = NOW();

-- Insert or update default admin profile
INSERT INTO profiles (id, name, role)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Admin User',
    'admin'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- Insert or update default knowledge base
INSERT INTO knowledge_bases (id, name, description, user_id, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Knowledge Base',
    'This is the default knowledge base created for the application.',
    '00000000-0000-0000-0000-000000000000',
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    user_id = EXCLUDED.user_id,
    status = EXCLUDED.status,
    updated_at = NOW(); 
