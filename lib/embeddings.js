/**
 * Ollama 임베딩 생성기
 * nomic-embed-text 모델 사용 (768차원)
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

export async function embed(text) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`임베딩 생성 실패: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return data.embeddings[0];
}

export async function embedBatch(texts) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`배치 임베딩 실패: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return data.embeddings;
}

export function getEmbeddingConfig() {
  return { provider: 'ollama', model: EMBEDDING_MODEL, baseUrl: OLLAMA_BASE_URL };
}
