from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from app.core.config import settings
import uuid

model = SentenceTransformer('all-MiniLM-L6-v2')

def get_pinecone_index():
    pc = Pinecone(api_key=settings.PINECONE_API_KEY)
    return pc.Index(settings.PINECONE_INDEX_NAME)

def embed_text(text: str):
    return model.encode(text).tolist()

def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50):
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = ' '.join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks

def upsert_document(doc_id: str, chunks: list, doc_title: str):
    index = get_pinecone_index()
    vectors = []
    for i, chunk in enumerate(chunks):
        embedding = embed_text(chunk)
        vectors.append({
            "id": f"{doc_id}_chunk_{i}",
            "values": embedding,
            "metadata": {
                "doc_id": doc_id,
                "chunk_index": i,
                "doc_title": doc_title,
                "chunk_text": chunk[:500]
            }
        })
    if vectors:
        index.upsert(vectors=vectors)
    return len(vectors)

def search_similar(query: str, top_k: int = 5):
    index = get_pinecone_index()
    query_embedding = embed_text(query)
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )
    return results.matches

def delete_document(doc_id: str, chunk_count: int):
    index = get_pinecone_index()
    ids = [f"{doc_id}_chunk_{i}" for i in range(chunk_count)]
    index.delete(ids=ids)
