CREATE TABLE IF NOT EXISTS public_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    status BOOLEAN DEFAULT true,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS public_links_user_id_idx ON public_links(user_id);
CREATE INDEX IF NOT EXISTS public_links_knowledge_base_id_idx ON public_links(knowledge_base_id);

create trigger update_public_links_updated_at
  before update on public_links
  for each row
  execute function update_updated_at_column();
