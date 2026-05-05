/**
 * LLM 프로바이더 — Ollama via OpenAI-compatible API
 * 동적 모델 선택 지원
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gemma4';

const ollama = createOpenAICompatible({
  name: 'ollama',
  baseURL: `${OLLAMA_BASE_URL}/v1`,
});

/**
 * 채팅용 LLM 모델 가져오기
 * @param {string} modelName - 모델 이름 (없으면 기본값 사용)
 */
export function getChatModel(modelName) {
  return ollama(modelName || DEFAULT_MODEL);
}

export function getLlmConfig() {
  return {
    provider: 'ollama',
    model: DEFAULT_MODEL,
    baseUrl: OLLAMA_BASE_URL,
  };
}
