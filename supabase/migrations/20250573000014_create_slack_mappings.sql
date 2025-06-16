CREATE TYPE slack_mapping_type AS ENUM ('user', 'channel');

CREATE TABLE slack_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slack_id TEXT NOT NULL,
    mapping_type slack_mapping_type NOT NULL,
    public_link_id UUID NOT NULL REFERENCES public_links(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(slack_id, mapping_type)
);

CREATE TRIGGER update_slack_mappings_updated_at
    BEFORE UPDATE ON slack_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 
