from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional
from .database import Database
import textwrap


# Does split_text really belong in this class? It's a utility function
class SemanticSearch:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model: SentenceTransformer = SentenceTransformer(model_name)

    def embed(self, db: Database, document_id: str, text: str, chunk_size: int, chunk_overlap: int) -> int:
        # Split the text into chunks with the given chunk size and overlap
        chunks = self.split_text(text, chunk_size, chunk_overlap)
        # Add chunks to database
        chunk_ids = db.add_chunks(document_id, chunks)
        # Generate and store embeddings
        embeddings = self.model.encode(chunks)
        db.add_embeddings(document_id, chunk_ids, embeddings)
        return len(embeddings)

    def search(self, db: Database, query: str, top_k: int = 5, document_id: Optional[str] = None) -> List[Dict[str, Any]]:
        # Generate embedding for the query
        query_embedding = self.model.encode([query])[0]
        # Search database for similar chunks
        results = db.search_similar(query_embedding, top_k, document_id)
        return results

    def split_text(self, text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
        # TODO: chunk_overlap
        # Split the text into chunks with the given chunk size
        return textwrap.wrap(text, width=chunk_size, break_long_words=False, break_on_hyphens=False)
