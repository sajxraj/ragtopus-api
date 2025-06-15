-- Create document_links table
CREATE TABLE IF NOT EXISTS document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url varchar(255),
    filename varchar(255),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE document_links ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own document links
CREATE POLICY "Users can view their own document links"
    ON document_links
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own document links
CREATE POLICY "Users can insert their own document links"
    ON document_links
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own document links
CREATE POLICY "Users can update their own document links"
    ON document_links
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own document links
CREATE POLICY "Users can delete their own document links"
    ON document_links
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON document_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 