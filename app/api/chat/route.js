import { streamText } from 'ai';
import { nanoid } from 'nanoid';
import { getChatModel } from '@/lib/llm';
import { retrieve, buildSystemPrompt } from '@/lib/rag';
import { createMessage, listMessages } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('notebookId') || body.notebookId;
    const messages = body.messages || [];
    const selectedModel = body.model; // 프론트엔드에서 선택한 모델

    if (!notebookId || !messages?.length) {
      return Response.json({ error: 'notebookId와 messages가 필요합니다.' }, { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1];
    const userContent = lastUserMessage.content ||
      (lastUserMessage.parts?.find(p => p.type === 'text')?.text) || '';

    // RAG 검색
    const { context, citations } = await retrieve(notebookId, userContent);
    const systemPrompt = buildSystemPrompt(context);

    // 사용자 메시지 저장
    createMessage({
      id: nanoid(12),
      notebook_id: notebookId,
      role: 'user',
      content: userContent,
    });

    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content || (m.parts?.find(p => p.type === 'text')?.text) || '',
    }));

    // 스트리밍 응답 (선택된 모델 사용)
    const result = streamText({
      model: getChatModel(selectedModel),
      system: systemPrompt,
      messages: formattedMessages,
      onFinish: async ({ text }) => {
        createMessage({
          id: nanoid(12),
          notebook_id: notebookId,
          role: 'assistant',
          content: text,
          citations,
        });
      },
    });

    const citationsHeader = Buffer.from(JSON.stringify(citations)).toString('base64');

    if (typeof result.toDataStreamResponse === 'function') {
      return result.toDataStreamResponse({
        headers: { 'X-Citations': citationsHeader },
      });
    } else if (typeof result.toTextStreamResponse === 'function') {
      return result.toTextStreamResponse({
        headers: { 'X-Citations': citationsHeader },
      });
    } else {
      return new Response(result.textStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Citations': citationsHeader,
        },
      });
    }
  } catch (error) {
    console.error('채팅 에러:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('notebookId');
    if (!notebookId) return Response.json({ error: 'notebookId가 필요합니다.' }, { status: 400 });
    return Response.json(listMessages(notebookId));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
