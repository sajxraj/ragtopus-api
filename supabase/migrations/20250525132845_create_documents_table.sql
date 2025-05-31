create table if not exists documents (
    id bigserial primary KEY,
    content TEXT,
    embedding vector(1536),
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    created_at timestamp with time zone default current_timestamp,
    updated_at timestamp with time zone default current_timestamp
);

-- Create match document function
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  kb_id UUID
)
returns table (
  id bigint,
  content text,
  similarity float
)
language plpgsql
as $$
begin
return query
select
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
from documents
where 1 - (documents.embedding <=> query_embedding) > match_threshold
    and documents.knowledge_base_id = kb_id
order by similarity desc
    limit match_count;
end;
$$;

create trigger update_documents_updated_at
  before update on documents
  for each row
  execute function update_updated_at_column();
