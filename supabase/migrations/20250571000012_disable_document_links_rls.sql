-- Drop all policies from document_links table
DROP POLICY IF EXISTS "Users can view their own document links" ON document_links;
DROP POLICY IF EXISTS "Users can insert their own document links" ON document_links;
DROP POLICY IF EXISTS "Users can update their own document links" ON document_links;
DROP POLICY IF EXISTS "Users can delete their own document links" ON document_links;

-- Disable RLS on document_links table
ALTER TABLE document_links DISABLE ROW LEVEL SECURITY; 