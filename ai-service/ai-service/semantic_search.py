import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import textwrap


class SemanticSearch:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model: SentenceTransformer = SentenceTransformer(model_name)
        self.documents: list[str] = []
        self.doc_lookup: dict[str, int] = {}
        self.embeddings: list[np.ndarray] = []

    def add_documents(self, documents: dict[str, str]):
        new_docs = {
            name: text
            for name, text in documents.items()
            if name not in self.doc_lookup
        }

        if new_docs:
            self._add_new_documents(new_docs)

    def _add_new_documents(self, documents: dict[str, str]):
        new_texts = list(documents.values())
        new_names = list(documents.keys())

        new_embeddings = self.model.encode(new_texts)

        if self.embeddings:
            self.embeddings = np.vstack([self.embeddings, new_embeddings])
        else:
            self.embeddings = new_embeddings

        for name, text in zip(new_names, new_texts):
            self.documents.append(text)
            self.doc_lookup[name] = len(self.documents) - 1

    def search(self, query: str, top_k: int = 5):
        query_embedding = self.model.encode([query])
        similarities = cosine_similarity(query_embedding, self.embeddings)[0]
        top_indices = np.argsort(similarities)[::-1][:top_k]
        results = []
        for index in top_indices:
            results.append({
                'document': self.documents[index],
                'score': similarities[index],
                'snippet': self._create_snippet(self.documents[index])
            })

        return results

    def _create_snippet(self, text: str, max_length: int = 200):
        return textwrap.shorten(text, width=max_length, placeholder='...')
