from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .semantic_search import SemanticSearch
from .database import Database
import os

# Initiate app with proper root path
app = FastAPI()

# Add CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite's default dev server
        "http://127.0.0.1:5173",  # Add localhost alternatives
        "http://localhost:3000",  # Express.js server
        "http://127.0.0.1:3000",  # Add localhost alternatives
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize database connection
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")

db = Database(DATABASE_URL)

# Initialize semantic search with database
search_engine = SemanticSearch(db)

class Document(BaseModel):
    document_text: str
    chunk_size: int = 100
    chunk_overlap: int = 20

class SearchQuery(BaseModel):
    document_id: str
    query: str
    top_k: int = 5

@app.get("/")
def read_root():
    return {"message": "Canvo AI Service API"}

@app.post("/embed")
def embed(document: Document):
    try:
        document_id = search_engine.add_document(
            text=document.document_text,
        )
        num_embeddings = search_engine.embed(
            document_id=document_id,
            chunk_size=document.chunk_size,
            chunk_overlap=document.chunk_overlap
        )
        return {"status": "success", "document_id": document_id, "num_embeddings": num_embeddings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
def search(search_query: SearchQuery):
    try:
        search_results = search_engine.search(
            search_query.query,
            search_query.top_k,
            search_query.document_id
        )
        return {"status": "success", "search_results": search_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Add cleanup on shutdown
@app.on_event("shutdown")
async def shutdown_event():
    db.close()
