import { nanoid } from 'nanoid';
import { listNotes, createNote, updateNote, deleteNote } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('notebookId');
    if (!notebookId) return Response.json({ error: 'notebookId가 필요합니다.' }, { status: 400 });
    return Response.json(listNotes(notebookId));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { notebookId, title = '', content = '' } = await request.json();
    if (!notebookId) return Response.json({ error: 'notebookId가 필요합니다.' }, { status: 400 });
    const note = createNote({ id: nanoid(12), notebook_id: notebookId, title, content });
    return Response.json(note, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, title, content, pinned } = await request.json();
    if (!id) return Response.json({ error: 'id가 필요합니다.' }, { status: 400 });
    const note = updateNote(id, { title, content, pinned });
    return Response.json(note);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'id가 필요합니다.' }, { status: 400 });
    deleteNote(id);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
