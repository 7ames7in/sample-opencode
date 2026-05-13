'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, MessageCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NeoHomePage() {
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
      if (!res.ok) throw new Error('목록 로드 실패');
      const data = await res.json();
      setNotebooks(data);
    } catch (e) {
      console.error(e);
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
        router.push(`/neo/notebook/${nb.id}`);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const emojis = ['📓', '🔬', '📊', '💡', '🎯', '📚', '🧠', '🔍', '📝', '🚀', '💻', '🌍'];

  return (
    <main className="home-container">
      <header className="home-header">
        <h1 className="home-logo">NEO NOTEBOOK</h1>
        <p className="home-subtitle">RAW DESIGN. POWERFUL AI.</p>
      </header>

      <div className="notebook-grid">
        <div className="card notebook-card notebook-card-new" onClick={() => setShowModal(true)}>
          <Plus size={48} strokeWidth={3} />
          <span>NEW PROJECT</span>
        </div>

        {notebooks.map(nb => (
          <div key={nb.id} className="card card-interactive notebook-card" onClick={() => router.push(`/neo/notebook/${nb.id}`)}>
            <span className="notebook-card-emoji">{nb.emoji || '📓'}</span>
            <span className="notebook-card-name">{nb.name}</span>
            <div className="notebook-card-meta">
              <span>{nb.source_count || 0} SOURCES</span>
              <span>{nb.message_count || 0} MESSAGES</span>
            </div>
            <div className="card-arrow">
              <ArrowRight size={24} strokeWidth={3} />
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">CREATE NEW</h2>
            <div className="form-group">
              <label className="form-label">ICON</label>
              <div className="emoji-picker">
                {emojis.map(e => (
                  <button
                    key={e}
                    className={`emoji-option ${newEmoji === e ? 'is-selected' : ''}`}
                    onClick={() => setNewEmoji(e)}
                    type="button"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">NAME</label>
              <input className="input" placeholder="PROJECT NAME..." value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>CANCEL</button>
              <button className="btn btn-primary" onClick={handleCreate}>CREATE</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
