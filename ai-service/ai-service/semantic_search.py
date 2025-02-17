from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional
from .database import Database
import textwrap
import uuid

class SemanticSearch:
    def __init__(self, db: Database, model_name: str = "all-MiniLM-L6-v2"):
        self.model: SentenceTransformer = SentenceTransformer(model_name)
        self.db: Database = db

    def add_document(self, text: str) -> str:
        # Add document to database
        document_id = str(uuid.uuid4())
        self.db.add_document(document_id, text)
        return document_id

    def embed(self, document_id: str, chunk_size: int, chunk_overlap: int) -> int:
        # Get the text from the database
        text = self.db.get_document_text(document_id)
        # Split the text into chunks with the given chunk size and overlap
        chunks = self.split_text(text, chunk_size, chunk_overlap)
        # Add chunks to database
        chunk_ids = self.db.add_chunks(document_id, chunks)
        # Generate and store embeddings
        embeddings = self.model.encode(chunks)
        self.db.add_embeddings(document_id, chunk_ids, embeddings)
        return len(embeddings)

    def search(self, query: str, top_k: int = 5, document_id: Optional[str] = None) -> List[Dict[str, Any]]:
        # Generate embedding for the query
        query_embedding = self.model.encode([query])[0]
        # Search database for similar chunks
        results = self.db.search_similar(query_embedding, top_k, document_id)
        return results

    def split_text(self, text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
        # Split the text into chunks with the given chunk size and overlap
        return textwrap.fill(text, width=chunk_size, break_long_words=False, break_on_hyphens=False)
