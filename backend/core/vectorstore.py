import logging
import json
from typing import List, Dict, Any
from models.schemas import TranscriptChunk
from core.config import settings

logger = logging.getLogger(__name__)


def get_chroma_client():
    try:
        import chromadb
        return chromadb.PersistentClient(path=settings.chroma_persist_dir)
    except ImportError:
        logger.warning("chromadb not installed")
        return None


def get_embedding_function():
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)

        class EmbedFn:
            def __init__(self, c): self.c = c
            def __call__(self, input: List[str]) -> List[List[float]]:
                r = self.c.embeddings.create(input=input, model=settings.embedding_model)
                return [i.embedding for i in r.data]

        return EmbedFn(client)
    except Exception as e:
        logger.warning(f"Embeddings unavailable: {e}")
        return None


def get_collection(job_id: str):
    client = get_chroma_client()
    if not client:
        return None
    name = f"ns_{job_id.replace('-', '_')[:40]}"
    embed_fn = get_embedding_function()
    try:
        if embed_fn:
            return client.get_or_create_collection(name=name, embedding_function=embed_fn, metadata={"hnsw:space": "cosine"})
        return client.get_or_create_collection(name=name, metadata={"hnsw:space": "cosine"})
    except Exception as e:
        logger.error(f"Collection error: {e}")
        return None


def embed_and_store_chunks(job_id: str, chunks: List[TranscriptChunk]) -> bool:
    collection = get_collection(job_id)
    if not collection:
        return False
    try:
        ids = [c.chunk_id for c in chunks]
        docs = [c.text for c in chunks]
        metas = [{"start_time": c.start_time, "end_time": c.end_time, "token_count": c.token_count, "segment_ids": json.dumps(c.segment_ids), "job_id": job_id} for c in chunks]
        for i in range(0, len(chunks), 100):
            collection.upsert(ids=ids[i:i+100], documents=docs[i:i+100], metadatas=metas[i:i+100])
        logger.info(f"Stored {len(chunks)} chunks for job {job_id}")
        return True
    except Exception as e:
        logger.error(f"Store error: {e}")
        return False


def retrieve_relevant_chunks(job_id: str, query: str, top_k: int = None) -> List[Dict[str, Any]]:
    top_k = top_k or settings.retrieval_top_k
    collection = get_collection(job_id)
    if not collection:
        return []
    try:
        count = collection.count()
        if count == 0:
            return []
        results = collection.query(query_texts=[query], n_results=min(top_k, count), include=["documents", "metadatas", "distances"])
        chunks = []
        if results and results["documents"]:
            for doc, meta, dist in zip(results["documents"][0], results["metadatas"][0], results["distances"][0]):
                chunks.append({"text": doc, "start_time": meta.get("start_time", 0), "end_time": meta.get("end_time", 0), "score": 1 - dist})
        chunks.sort(key=lambda x: x["start_time"])
        return chunks
    except Exception as e:
        logger.error(f"Retrieval error: {e}")
        return []
