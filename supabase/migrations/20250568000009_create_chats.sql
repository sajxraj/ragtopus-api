CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    user_id UUID,
    conversation_id UUID NOT NULL,
    role chat_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chat_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT chat_conversation_fk FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS chats_user_id_idx ON chats(user_id);
CREATE INDEX IF NOT EXISTS chats_conversation_id_idx ON chats(conversation_id);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 