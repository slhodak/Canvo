from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict
from .semantic_search import SemanticSearch

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

search_engine = SemanticSearch()


class Documents(BaseModel):
    documents: Dict[str, str]


class SearchQuery(BaseModel):
    query: str
    top_k: int = 5


@app.get("/")
def read_root():
    return {"message": "Canvo AI Service API"}


@app.post("/embed")
def embed(docs: Documents):
    try:
        search_engine.add_documents(docs.documents)
        return {"message": f"Successfully added {len(docs.documents)} documents"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search")
def search(search_query: SearchQuery):
    try:
        results = search_engine.search(search_query.query, search_query.top_k)
        # Convert numpy values to Python native types
        processed_results = [
            {
                "document": r["document"],
                "score": float(r["score"]),
                "snippet": r["snippet"],
            }
            for r in results
        ]
        return {"results": processed_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
