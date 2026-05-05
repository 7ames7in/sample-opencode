/**
 * 로컬 벡터 저장소
 * 파일 기반 cosine similarity 검색
 */
import fs from 'fs';
import path from 'path';
import { embed, embedBatch } from './embeddings.js';

const DATA_DIR = path.join(process.cwd(), 'data', 'vectors');

const _collections = new Map();

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getCollection(notebookId) {
  if (_collections.has(notebookId)) {
    return _collections.get(notebookId);
  }

  const filePath = path.join(DATA_DIR, `${notebookId}.json`);
  let collection = { documents: [], embeddings: [], metadatas: [], ids: [] };

  if (fs.existsSync(filePath)) {
    try {
      collection = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.warn('벡터 파일 로드 실패:', e.message);
    }
  }

  _collections.set(notebookId, collection);
  return collection;
}

function saveCollection(notebookId) {
  ensureDir(DATA_DIR);
  const collection = _collections.get(notebookId);
  if (!collection) return;
  const filePath = path.join(DATA_DIR, `${notebookId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(collection));
}

function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    const ai = a[i];
    const bi = b[i];
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 문서 청크를 벡터 DB에 저장
 */
export async function addDocuments(notebookId, sourceId, sourceName, chunks) {
  if (!chunks.length) return;

  const collection = getCollection(notebookId);
  const texts = chunks.map(c => c.text);
  const embeddings = await embedBatch(texts);

  for (let i = 0; i < chunks.length; i++) {
    const id = `${sourceId}_chunk_${chunks[i].index}`;
    const existingIdx = collection.ids.indexOf(id);
    if (existingIdx >= 0) {
      collection.documents[existingIdx] = texts[i];
      collection.embeddings[existingIdx] = embeddings[i];
      collection.metadatas[existingIdx] = { sourceId, sourceName, chunkIndex: chunks[i].index };
    } else {
      collection.ids.push(id);
      collection.documents.push(texts[i]);
      collection.embeddings.push(embeddings[i]);
      collection.metadatas.push({ sourceId, sourceName, chunkIndex: chunks[i].index });
    }
  }

  saveCollection(notebookId);
}

/**
 * 유사도 검색
 */
export async function search(notebookId, query, { topK = 5, sourceIds } = {}) {
  const collection = getCollection(notebookId);
  if (!collection.documents.length) return [];

  const queryEmbedding = await embed(query);
  const qVec = new Float32Array(queryEmbedding);

  let scored = [];
  const len = collection.documents.length;
  
  for (let i = 0; i < len; i++) {
    const sId = collection.metadatas[i].sourceId;
    // 소스 필터링이 있는 경우 먼저 확인
    if (sourceIds?.length && !sourceIds.includes(sId)) continue;

    const score = cosineSimilarity(qVec, collection.embeddings[i]);
    
    scored.push({
      text: collection.documents[i],
      sourceId: sId,
      sourceName: collection.metadatas[i].sourceName,
      score: score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * 특정 소스의 벡터 삭제
 */
export async function deleteBySource(notebookId, sourceId) {
  const collection = getCollection(notebookId);

  for (let i = collection.metadatas.length - 1; i >= 0; i--) {
    if (collection.metadatas[i].sourceId === sourceId) {
      collection.ids.splice(i, 1);
      collection.documents.splice(i, 1);
      collection.embeddings.splice(i, 1);
      collection.metadatas.splice(i, 1);
    }
  }

  saveCollection(notebookId);
}

/**
 * 노트북 전체 컬렉션 삭제
 */
export async function deleteCollection(notebookId) {
  _collections.delete(notebookId);
  const filePath = path.join(DATA_DIR, `${notebookId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
