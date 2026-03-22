-- RAG Schema Migration: pgvector setup and knowledge_documents table
-- Requirements: 1.1, 1.2, 1.3, 1.6

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge documents table for RAG
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    embedding VECTOR(768) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IVFFlat index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_embedding
    ON knowledge_documents
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index on metadata for filtering by source_type
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source_type
    ON knowledge_documents ((metadata->>'source_type'));

-- Unique constraint to prevent duplicate documents per source
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_documents_source_unique
    ON knowledge_documents ((metadata->>'source_type'), (metadata->>'source_id'));

-- RPC function for similarity search used by RagService
CREATE OR REPLACE FUNCTION match_knowledge_documents(
    query_embedding VECTOR(768),
    match_threshold DOUBLE PRECISION DEFAULT 0.3,
    match_count INT DEFAULT 5,
    filter_source_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    relevance_score DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kd.id,
        kd.content,
        kd.metadata,
        (1 - (kd.embedding <=> query_embedding))::DOUBLE PRECISION AS relevance_score
    FROM knowledge_documents kd
    WHERE (1 - (kd.embedding <=> query_embedding)) >= match_threshold
      AND (filter_source_type IS NULL OR kd.metadata->>'source_type' = filter_source_type)
    ORDER BY kd.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
