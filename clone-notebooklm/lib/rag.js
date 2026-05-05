/**
 * RAG 파이프라인
 * 벡터 검색 → 컨텍스트 구성 → 시스템 프롬프트 생성
 */
import { search } from './vector.js';
import { listSources } from './db.js';

export async function retrieve(notebookId, query) {
  const sources = listSources(notebookId).filter(s => s.enabled);
  const sourceIds = sources.map(s => s.id);

  if (!sourceIds.length) {
    return {
      context: '',
      citations: [],
      message: '활성화된 소스가 없습니다. 소스를 추가해주세요.',
    };
  }

  const results = await search(notebookId, query, { topK: 5, sourceIds });

  console.log(`[RAG] Query: "${query}"`);
  console.log(`[RAG] Found ${results.length} relevant chunks`);

  if (!results.length) {
    return { context: '', citations: [], message: '관련 내용을 찾을 수 없습니다.' };
  }

  const citations = results.map((r, i) => ({
    index: i + 1,
    sourceId: r.sourceId,
    sourceName: r.sourceName,
    text: r.text.slice(0, 200),
    score: r.score,
  }));

  const context = results
    .map((r, i) => `[소스 ${i + 1}: ${r.sourceName}]\n${r.text}`)
    .join('\n\n---\n\n');

  return { context, citations };
}

export function buildSystemPrompt(context) {
  if (!context) {
    return `당신은 도움이 되는 AI 연구 어시스턴트입니다.
현재 참조할 소스가 없습니다. 사용자에게 소스를 추가하도록 안내해주세요.
한국어로 답변해주세요.`;
  }

  return `당신은 정확하고 유용한 AI 연구 어시스턴트입니다.
아래 소스 자료를 기반으로 사용자의 질문에 답변하세요.

## 규칙
1. 반드시 제공된 소스 자료에 기반하여 답변하세요.
2. 답변에 인용을 포함하세요. 형식: [1], [2] 등
3. 소스에 없는 내용은 추측하지 말고, "소스에서 해당 정보를 찾을 수 없습니다"라고 답하세요.
4. 한국어로 답변하세요.
5. 명확하고 구조화된 형식으로 답변하세요 (목록, 제목 등 활용).
6. 마크다운 형식을 사용하세요.

## 참조 소스
${context}`;
}
