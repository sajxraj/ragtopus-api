-- Add document_link_id column to documents table
ALTER TABLE documents
ADD COLUMN document_link_id UUID REFERENCES document_links(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_documents_document_link_id ON documents(document_link_id); 