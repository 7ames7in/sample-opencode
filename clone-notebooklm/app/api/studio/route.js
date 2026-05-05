import { nanoid } from 'nanoid';
import { getChatModel } from '@/lib/llm';
import { listSources, createArtifact, listArtifacts } from '@/lib/db';
import { generateText } from 'ai';

const ARTIFACT_PROMPTS = {
  briefing: {
    title: '브리핑 문서',
    prompt: `다음 소스 자료를 기반으로 포괄적인 브리핑 문서를 작성하세요.

구조:
1. 핵심 요약 (3-5문장)
2. 주요 발견사항 (bullet points)
3. 상세 분석
4. 결론 및 시사점

마크다운 형식으로 작성하세요. 한국어로 답변하세요.`,
  },
  faq: {
    title: 'FAQ',
    prompt: `다음 소스 자료를 기반으로 FAQ(자주 묻는 질문) 문서를 작성하세요.

요구사항:
- 8-12개의 질문과 답변
- 가장 중요하고 자주 물어볼 만한 질문 선정
- 각 답변은 간결하지만 완전해야 함
- Q: / A: 형식 사용

마크다운 형식으로 작성하세요. 한국어로 답변하세요.`,
  },
  study_guide: {
    title: '학습 가이드',
    prompt: `다음 소스 자료를 기반으로 학습 가이드를 작성하세요.

구조:
1. 학습 목표
2. 핵심 개념 정리 (용어 설명 포함)
3. 주요 내용 요약
4. 핵심 포인트 체크리스트
5. 복습 질문 (5개)

마크다운 형식으로 작성하세요. 한국어로 답변하세요.`,
  },
  timeline: {
    title: '타임라인',
    prompt: `다음 소스 자료를 기반으로 시간순 타임라인을 작성하세요.

요구사항:
- 주요 사건/이벤트를 시간 순서대로 정리
- 각 항목에 날짜/시기와 설명 포함
- 중요도에 따라 상세 설명 추가
- 가능하다면 원인-결과 관계 표시

마크다운 형식으로 작성하세요. 한국어로 답변하세요.`,
  },
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('notebookId');
    if (!notebookId) return Response.json({ error: 'notebookId가 필요합니다.' }, { status: 400 });
    return Response.json(listArtifacts(notebookId));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { notebookId, type, model: selectedModel } = await request.json();
    if (!notebookId || !type) {
      return Response.json({ error: 'notebookId와 type이 필요합니다.' }, { status: 400 });
    }

    const artifactConfig = ARTIFACT_PROMPTS[type];
    if (!artifactConfig) {
      return Response.json({ error: `지원하지 않는 아티팩트 타입: ${type}` }, { status: 400 });
    }

    // 소스 컨텍스트 수집
    const sources = listSources(notebookId).filter(s => s.enabled);
    if (!sources.length) {
      return Response.json({ error: '활성화된 소스가 없습니다.' }, { status: 400 });
    }

    const sourceContext = sources
      .map(s => `### ${s.name}\n${(s.content || '').slice(0, 3000)}`)
      .join('\n\n---\n\n');

    const { text } = await generateText({
      model: getChatModel(selectedModel),
      system: artifactConfig.prompt,
      prompt: `다음 소스 자료를 분석하세요:\n\n${sourceContext}`,
    });

    const artifact = createArtifact({
      id: nanoid(12),
      notebook_id: notebookId,
      type,
      title: artifactConfig.title,
      content: text,
    });

    return Response.json(artifact, { status: 201 });
  } catch (error) {
    console.error('스튜디오 에러:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
