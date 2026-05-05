import { nanoid } from 'nanoid';
import { createSource, listSources, deleteSource as dbDeleteSource, getSource, toggleSource } from '@/lib/db';
import { addDocuments, deleteBySource } from '@/lib/vector';
import { chunkText } from '@/lib/chunker';
import { parseText } from '@/lib/parsers/text';
import { parseUrl } from '@/lib/parsers/url';
import { isYoutubeUrl, parseYoutube } from '@/lib/parsers/youtube';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('notebookId');
    if (!notebookId) return Response.json({ error: 'notebookId가 필요합니다.' }, { status: 400 });
    return Response.json(listSources(notebookId));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let parsed;
    let notebookId;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      notebookId = formData.get('notebookId');
      const file = formData.get('file');
      if (!file || !notebookId) {
        return Response.json({ error: 'notebookId와 file이 필요합니다.' }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const { parsePdf } = await import('@/lib/parsers/pdf');
      parsed = await parsePdf(buffer, file.name);
    } else {
      const body = await request.json();
      notebookId = body.notebookId;
      const { type, content, name, url } = body;
      if (!notebookId) return Response.json({ error: 'notebookId가 필요합니다.' }, { status: 400 });

      if (type === 'text') {
        if (!content?.trim()) return Response.json({ error: '텍스트 내용이 필요합니다.' }, { status: 400 });
        parsed = parseText(content, name || '텍스트 입력');
      } else if (type === 'url') {
        if (!url?.trim()) return Response.json({ error: 'URL이 필요합니다.' }, { status: 400 });
        // YouTube URL 자동 감지
        if (isYoutubeUrl(url)) {
          parsed = await parseYoutube(url);
        } else {
          parsed = await parseUrl(url);
        }
      } else {
        return Response.json({ error: `지원하지 않는 소스 타입: ${type}` }, { status: 400 });
      }
    }

    const sourceId = nanoid(12);
    const source = createSource({
      id: sourceId,
      notebook_id: notebookId,
      type: parsed.metadata.type || 'text',
      name: parsed.name,
      content: parsed.content,
      metadata: parsed.metadata,
      char_count: parsed.charCount,
    });

    const chunks = chunkText(parsed.content);
    if (chunks.length > 0) {
      await addDocuments(notebookId, sourceId, parsed.name, chunks);
    }

    return Response.json({ ...source, chunkCount: chunks.length }, { status: 201 });
  } catch (error) {
    console.error('소스 추가 에러:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, enabled } = await request.json();
    if (!id) return Response.json({ error: 'id가 필요합니다.' }, { status: 400 });
    toggleSource(id, enabled);
    const updatedSource = getSource(id);
    return Response.json(updatedSource);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'id가 필요합니다.' }, { status: 400 });

    const source = getSource(id);
    if (!source) return Response.json({ error: '소스를 찾을 수 없습니다.' }, { status: 404 });

    await deleteBySource(source.notebook_id, id);
    dbDeleteSource(id);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
