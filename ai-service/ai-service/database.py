import psycopg
from psycopg.extras import RealDictCursor
from typing import List, Dict, Any, Optional
import numpy as np
from pgvector.psycopg import register_vector

class Database:
    def __init__(self, connection_string: str):
        """Initialize database connection"""
        self.connection_string = connection_string
        self._connection = None
        self._cursor = None

    def connect(self):
        """Create database connection"""
        if not self._connection:
            self._connection = psycopg.connect(self.connection_string)
            self._cursor = self._connection.cursor(cursor_factory=RealDictCursor)
            register_vector(self._connection)
        return self._connection

    def close(self):
        """Close database connection"""
        if self._cursor:
            self._cursor.close()
        if self._connection:
            self._connection.close()
            self._connection = None
            self._cursor = None

    def add_document(self, document_id: str, text: str) -> int:
        """Add a document to the database and return its ID"""
        try:
            self.connect()
            self._cursor.execute(
                "INSERT INTO documents (document_id, text) VALUES (%s, %s) RETURNING id",
                (document_id, text)
            )
            document_db_id = self._cursor.fetchone()['id']
            self._connection.commit()
            return document_db_id
        except Exception as e:
            self._connection.rollback()
            raise e

    def add_chunks(self, document_db_id: int, chunks: List[str]) -> List[int]:
        """Add chunks for a document and return their IDs"""
        try:
            self.connect()
            chunk_ids = []
            for idx, chunk in enumerate(chunks):
                self._cursor.execute(
                    """
                    INSERT INTO chunks (document_id, text, chunk_index)
                    VALUES (%s, %s, %s)
                    RETURNING id
                    """,
                    (document_db_id, chunk, idx)
                )
                chunk_ids.append(self._cursor.fetchone()['id'])
            self._connection.commit()
            return chunk_ids
        except Exception as e:
            self._connection.rollback()
            raise e

    def add_embeddings(self, document_db_id: int, chunk_ids: List[int], embeddings: np.ndarray):
        """Add embeddings for chunks"""
        try:
            self.connect()
            for chunk_id, embedding in zip(chunk_ids, embeddings):
                self._cursor.execute(
                    """
                    INSERT INTO embeddings (document_id, chunk_id, vector)
                    VALUES (%s, %s, %s)
                    """,
                    (document_db_id, chunk_id, embedding.tolist())
                )
            self._connection.commit()
        except Exception as e:
            self._connection.rollback()
            raise e

    def search_similar(self, query_embedding: np.ndarray, top_k: int, document_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search for similar chunks using vector similarity"""
        try:
            self.connect()
            query = """
                SELECT c.text, e.vector <=> %s AS distance
                FROM embeddings e
                JOIN chunks c ON c.id = e.chunk_id
                JOIN documents d ON d.id = c.document_id
                """
            
            params = [query_embedding.tolist()]
            
            if document_id:
                query += " WHERE d.document_id = %s"
                params.append(document_id)
            
            query += """
                ORDER BY distance ASC
                LIMIT %s
            """
            params.append(top_k)
            
            self._cursor.execute(query, params)
            results = self._cursor.fetchall()
            return [dict(r) for r in results]
        except Exception as e:
            raise e

    def get_document_chunks(self, document_id: str) -> List[str]:
        """Retrieve all chunks for a given document_id"""
        try:
            self.connect()
            self._cursor.execute(
                """
                SELECT c.text
                FROM chunks c
                JOIN documents d ON d.id = c.document_id
                WHERE d.document_id = %s
                ORDER BY c.chunk_index
                """,
                (document_id,)
            )
            results = self._cursor.fetchall()
            return [r['text'] for r in results]
        except Exception as e:
            raise e 