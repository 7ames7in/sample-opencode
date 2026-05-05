import { getNotebook, updateNotebook, deleteNotebook, listSources, listMessages, listArtifacts, listNotes } from '@/lib/db';
import { deleteCollection } from '@/lib/vector';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const notebook = getNotebook(id);
    if (!notebook) return Response.json({ error: '노트북을 찾을 수 없습니다.' }, { status: 404 });

    const sources = listSources(id);
    const messages = listMessages(id);
    const artifacts = listArtifacts(id);
    const notes = listNotes(id);

    return Response.json({ ...notebook, sources, messages, artifacts, notes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const notebook = updateNotebook(id, body);
    if (!notebook) return Response.json({ error: '노트북을 찾을 수 없습니다.' }, { status: 404 });
    return Response.json(notebook);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const notebook = getNotebook(id);
    if (!notebook) return Response.json({ error: '노트북을 찾을 수 없습니다.' }, { status: 404 });

    await deleteCollection(id);
    deleteNotebook(id);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
