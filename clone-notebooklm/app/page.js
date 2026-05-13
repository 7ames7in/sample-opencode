'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [notebooks, setNotebooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('📓');
  const router = useRouter();

  useEffect(() => { fetchNotebooks(); }, []);

  async function fetchNotebooks() {
    try {
      const res = await fetch('/api/notebooks');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
      }
      const data = await res.json();
      setNotebooks(data);
    } catch (e) {
      console.error('노트북 목록 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), emoji: newEmoji }),
      });
      if (res.ok) {
        const nb = await res.json();
        setShowModal(false);
        setNewName('');
        router.push(`/notebook/${nb.id}`);
      }
    } catch (e) {
      console.error('노트북 생성 실패:', e);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm('이 노트북을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/notebooks/${id}`, { method: 'DELETE' });
      setNotebooks(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error('삭제 실패:', e);
    }
  }

  const emojis = ['📓', '🔬', '📊', '💡', '🎯', '📚', '🧠', '🔍', '📝', '🚀', '💻', '🌍'];

  return (
    <main className="home-container">
      <header className="home-header">
        <h1 className="home-logo">NotebookLM</h1>
        <p className="home-subtitle">문서를 업로드하고 AI와 대화하세요</p>
        <div style={{ marginTop: '20px' }}>
          <button className="btn btn-primary" onClick={() => router.push('/neo')} style={{ background: '#ff008a', border: 'none', borderRadius: '100px' }}>
            Try Neo-Brutalism Edition ⚡️
          </button>
        </div>
      </header>

      <div className="notebook-grid">
        <div className="card notebook-card notebook-card-new" onClick={() => setShowModal(true)} id="create-notebook-btn">
          <Plus size={24} />
          <span>새 노트북</span>
        </div>

        {loading && (
          <>
            <div className="card notebook-card skeleton" style={{ minHeight: 160 }} />
            <div className="card notebook-card skeleton" style={{ minHeight: 160 }} />
          </>
        )}

        {notebooks.map(nb => (
          <div key={nb.id} className="card card-interactive notebook-card" onClick={() => router.push(`/notebook/${nb.id}`)} id={`notebook-${nb.id}`}>
            <span className="notebook-card-emoji">{nb.emoji || '📓'}</span>
            <span className="notebook-card-name">{nb.name}</span>
            <div className="notebook-card-meta">
              <span><FileText size={12} /> {nb.source_count || 0} 소스</span>
              <span><MessageCircle size={12} /> {nb.message_count || 0} 메시지</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={(e) => handleDelete(e, nb.id)} style={{ marginTop: 'auto' }}>삭제</button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">새 노트북 만들기</h2>
            <div className="form-group">
              <label className="form-label">아이콘</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {emojis.map(e => (
                  <button key={e} onClick={() => setNewEmoji(e)} style={{
                    fontSize: '1.5rem', padding: '6px', borderRadius: 'var(--radius-sm)',
                    border: newEmoji === e ? '2px solid var(--primary)' : '2px solid transparent',
                    background: newEmoji === e ? 'var(--primary-light)' : 'transparent', cursor: 'pointer',
                  }}>{e}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">노트북 이름</label>
              <input className="input" placeholder="예: AI 연구 자료" value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus id="notebook-name-input" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!newName.trim()} id="create-notebook-confirm">만들기</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
