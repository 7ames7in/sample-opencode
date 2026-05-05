import { nanoid } from 'nanoid';
import { listNotebooks, createNotebook } from '@/lib/db';

export async function GET() {
  try {
    return Response.json(listNotebooks());
  } catch (error) {
    console.error('API Error (GET /api/notebooks):', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, emoji = '📓', description = '' } = await request.json();
    if (!name?.trim()) {
      return Response.json({ error: '노트북 이름이 필요합니다.' }, { status: 400 });
    }
    const notebook = createNotebook({ id: nanoid(12), name: name.trim(), emoji, description });
    return Response.json(notebook, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
