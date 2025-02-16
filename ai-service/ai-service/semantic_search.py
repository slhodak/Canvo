import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import textwrap


class SemanticSearch:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model: SentenceTransformer = SentenceTransformer(model_name)
        self.chunks: list[str] = []
        self.embeddings: np.ndarray = np.array([])

    def add_chunks(self, chunks: list[str]):
        new_embeddings = self.model.encode(chunks)
        self.chunks = chunks
        self.embeddings = new_embeddings

    def search(self, query: str, top_k: int = 5):
        query_embedding = self.model.encode([query])
        similarities = cosine_similarity(query_embedding, self.embeddings)[0]
        top_indices = np.argsort(similarities)[::-1][:top_k]
        results = []
        for index in top_indices:
            results.append({
                'chunk': self.chunks[index],
                'score': similarities[index],
            })

        return results
