-- Add knowledge_base_id column to document_links table
ALTER TABLE document_links
ADD COLUMN knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS document_links_knowledge_base_id_idx ON document_links(knowledge_base_id); 