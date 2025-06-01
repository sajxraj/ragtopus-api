-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    last_interacted_at TIMESTAMPTZ,
    user_id UUID NOT NULL,
    description VARCHAR DEFAULT '',
    is_syncing BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT conversation_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON conversations(user_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own conversations"
    ON conversations
    FOR ALL
    USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 
