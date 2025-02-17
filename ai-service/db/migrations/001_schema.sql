CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    document_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chunks (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, chunk_index)
);

CREATE TABLE embeddings (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id INTEGER REFERENCES chunks(id) ON DELETE CASCADE,
    vector vector(1536),  -- Adjust dimension based on your embedding model
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chunk_id)
);

CREATE INDEX ON chunks(document_id);
CREATE INDEX ON embeddings(document_id);
CREATE INDEX ON embeddings(chunk_id);
CREATE INDEX embeddings_vector_idx ON embeddings USING ivfflat (vector vector_cosine_ops);
