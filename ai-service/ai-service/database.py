import psycopg
from typing import List, Tuple
import numpy as np
from pgvector.psycopg import register_vector
import uuid


class Database:
    def __init__(self, connection_string: str):
        """Initialize database connection"""
        self.connection_string = connection_string
        self._connection = None

    def connect(self):
        """Create database connection"""
        if not self._connection:
            self._connection = psycopg.connect(self.connection_string)
            register_vector(self._connection)
        return self._connection

    def close(self):
        """Close database connection"""
        if self._connection:
            self._connection.close()
            self._connection = None

    def get_document_id_by_hash(self, document_hash: str) -> str:
        """Get a document ID from the database"""
        try:
            self.connect()
            with self._connection.cursor() as cursor:
                cursor.execute(
                    "SELECT document_id FROM documents WHERE document_hash = %s",
                    (document_hash,)
                )
                result = cursor.fetchone()
                if result:
                    return result[0]
                else:
                    return None
        except Exception as e:
            self._connection.rollback()
            raise e

    def add_document(self, text: str, document_hash: str) -> str:
        """Add a document to the database and return its ID"""
        try:
            document_id = str(uuid.uuid4())
            self.connect()
            with self._connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO documents (document_id, document_hash, text) VALUES (%s, %s, %s) RETURNING id",
                    (document_id, document_hash, text)
                )
                self._connection.commit()
                return document_id
        except Exception as e:
            self._connection.rollback()
            raise e

    def add_chunks(self, document_id: str, chunks: List[str]) -> List[str]:
        """Add chunks for a document and return their IDs"""
        try:
            self.connect()
            chunk_ids = []
            for idx, chunk in enumerate(chunks):
                chunk_id = str(uuid.uuid4())
                with self._connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO chunks (chunk_id, document_id, text, chunk_index)
                        VALUES (%s, %s, %s, %s)
                        RETURNING id
                        """,
                        (chunk_id, document_id, chunk, idx)
                    )
                    chunk_ids.append(chunk_id)
            self._connection.commit()
            return chunk_ids
        except Exception as e:
            self._connection.rollback()
            raise e

    def add_embeddings(self, document_id: str, chunk_ids: List[str], embeddings: np.ndarray):
        """Add embeddings for chunks"""
        try:
            self.connect()
            for chunk_id, embedding in zip(chunk_ids, embeddings):
                vector_str = self.format_pgvector(embedding)
                with self._connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO embeddings (document_id, chunk_id, vector)
                        VALUES (%s, %s, %s)
                        """,
                        (document_id, chunk_id, vector_str)
                    )
            self._connection.commit()
        except Exception as e:
            self._connection.rollback()
            raise e

    def search_similar(self, query_embedding: np.ndarray, top_k: int, document_id: str) -> List[Tuple[str, float, int]]:
        """Search for similar chunks using vector similarity"""
        try:
            self.connect()
            query = """
                SELECT c.text, c.chunk_index, e.vector <=> %s AS distance
                FROM embeddings e
                JOIN chunks c ON c.chunk_id = e.chunk_id
                JOIN documents d ON d.document_id = c.document_id
                WHERE d.document_id = %s
                ORDER BY distance ASC
                LIMIT %s
                """
            params = [self.format_pgvector(
                query_embedding), document_id, top_k]

            with self._connection.cursor() as cursor:
                cursor.execute(query, params)
                results = cursor.fetchall()
                self._connection.commit()
                return results
        except Exception as e:
            self._connection.rollback()
            raise e

    def get_document_chunks(self, document_id: str) -> List[Tuple[str, int]]:
        """Retrieve all chunks for a given document_id"""
        try:
            self.connect()
            with self._connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT c.text, c.chunk_index
                    FROM chunks c
                    JOIN documents d ON d.document_id = c.document_id
                    WHERE d.document_id = %s
                    ORDER BY c.chunk_index
                    """,
                    (document_id,)
                )
                results = cursor.fetchall()
                self._connection.commit()
                return results
        except Exception as e:
            self._connection.rollback()
            raise e

    def get_document_chunks_between_indices(self, document_id: str, fromIndex: int, toIndex: int) -> List[Tuple[str, int]]:
        """Get chunks for a document at given indices"""
        try:
            self.connect()
            with self._connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT c.text, c.chunk_index
                    FROM chunks c
                    JOIN documents d ON d.document_id = c.document_id
                    WHERE d.document_id = %s AND c.chunk_index BETWEEN %s AND %s
                    ORDER BY c.chunk_index
                    """,
                    (document_id, fromIndex, toIndex)
                )
                results = cursor.fetchall()
                self._connection.commit()
                return results
        except Exception as e:
            self._connection.rollback()
            raise e

    def format_pgvector(self, vector: np.ndarray) -> str:
        """Format a numpy array as a PostgreSQL vector string"""
        return '[' + ', '.join(str(x) for x in vector.tolist()) + ']'

    def has_embeddings(self, document_id: str) -> bool:
        """Check if a document already has embeddings"""
        try:
            self.connect()
            with self._connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT EXISTS (
                        SELECT 1 
                        FROM embeddings e
                        JOIN chunks c ON c.chunk_id = e.chunk_id
                        WHERE e.document_id = %s
                    )
                    """,
                    (document_id,)
                )
                result = cursor.fetchone()
                return result[0] if result else False
        except Exception as e:
            self._connection.rollback()
            raise e
