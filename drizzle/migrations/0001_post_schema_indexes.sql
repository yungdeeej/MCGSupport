-- Indexes that drizzle-kit cannot express today.
-- Apply after the auto-generated schema migration.

-- HNSW vector index for fast cosine similarity over KB embeddings.
CREATE INDEX IF NOT EXISTS kb_embeddings_embedding_hnsw
  ON kb_embeddings USING hnsw (embedding vector_cosine_ops);

-- Trigram index for keyword fallback / fuzzy matching.
CREATE INDEX IF NOT EXISTS kb_embeddings_chunk_text_trgm
  ON kb_embeddings USING gin (chunk_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS kb_articles_title_trgm
  ON kb_articles USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS kb_articles_content_trgm
  ON kb_articles USING gin (content_md gin_trgm_ops);
