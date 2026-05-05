import { getLlmConfig } from '@/lib/llm';

// 모델 목록 캐시
let cachedModels = null;
let lastFetch = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5분

export async function GET() {
  const config = getLlmConfig();
  try {
    const start = Date.now();
    let models = [];

    // 캐시 확인
    if (cachedModels && (Date.now() - lastFetch < CACHE_TTL)) {
      models = cachedModels;
    } else {
      const response = await fetch(`${config.baseUrl}/api/tags`);
      if (!response.ok) throw new Error(`Ollama 서버 응답 에러 (Status: ${response.status})`);
      const data = await response.json();
      models = data.models || [];
      cachedModels = models;
      lastFetch = Date.now();
    }

    const duration = Date.now() - start;
    const targetModel = models.find(m => m.name.includes(config.model));

    return Response.json({
      status: 'ok',
      ollama: { connected: true, latency: `${duration}ms`, baseUrl: config.baseUrl, cached: (Date.now() - start) < 10 },
      model: { name: config.model, loaded: !!targetModel, details: targetModel || null },
      availableModels: models.map(m => m.name),
    });
  } catch (error) {
    return Response.json({ status: 'error', message: error.message, config }, { status: 500 });
  }
}
