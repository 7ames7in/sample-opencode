'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { ArrowLeft, Plus, FileText, Globe, Sparkles, X, ArrowRight, Video, Type, Calendar, ExternalLink, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function getSourceMetadata(source) {
  let metadata = {};
  if (!source?.metadata) return metadata;
  if (typeof source.metadata === 'object') metadata = source.metadata;
  try {
    if (typeof source.metadata === 'string') metadata = JSON.parse(source.metadata);
  } catch {}
  if (metadata.videoId) {
    metadata = {
      watchUrl: `https://www.youtube.com/watch?v=${metadata.videoId}`,
      embedUrl: `https://www.youtube.com/embed/${metadata.videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${metadata.videoId}/hqdefault.jpg`,
      ...metadata,
    };
  }
  return metadata;
}

function getSourceKind(source) {
  const metadata = getSourceMetadata(source);
  return metadata.type || source?.type || 'text';
}

function getSourceUrl(source) {
  const metadata = getSourceMetadata(source);
  return metadata.watchUrl || metadata.url || '';
}

export default function NeoNotebookPage() {
  const { id } = useParams();
  const router = useRouter();
  const [notebook, setNotebook] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [localInput, setLocalInput] = useState('');
  const [thinkingStep, setThinkingStep] = useState(0);
  const [selectedModel, setSelectedModel] = useState('');
  const [artifacts, setArtifacts] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const messagesEndRef = useRef(null);

  const thinkingMessages = [
    "RECRUITING CONTEXT...",
    "SEARCHING DATA...",
    "EXTRACTING KNOWLEDGE...",
    "ANALYZING CHUNKS...",
    "GENERATING RESPONSE...",
  ];

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/notebooks/${id}`);
        if (!res.ok) { router.push('/neo'); return; }
        const data = await res.json();
        setNotebook(data);
        setSources(data.sources || []);
        setArtifacts(data.artifacts || []);
        if (data.messages?.length) {
          setMessages(data.messages.map(m => ({ id: m.id, role: m.role, content: m.content })));
        }
      } catch { router.push('/neo'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (chatLoading) {
      const interval = setInterval(() => {
        setThinkingStep(prev => (prev < thinkingMessages.length ? prev + 1 : prev));
      }, 1500);
      return () => clearInterval(interval);
    } else { setThinkingStep(0); }
  }, [chatLoading]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!localInput.trim() || chatLoading) return;
    const content = localInput;
    setLocalInput('');
    setChatLoading(true);

    const userMsg = { id: nanoid(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch(`/api/chat?notebookId=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], notebookId: id }),
      });
      if (!response.ok) throw new Error('SERVER ERROR');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const aId = nanoid();
      setMessages(prev => [...prev, { id: aId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          const t = line.trim();
          if (!t) continue;
          if (t.startsWith('0:')) {
            try { assistantContent += JSON.parse(t.substring(2)); } catch {}
          } else { assistantContent += t + '\n'; }
          setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: assistantContent.trim() } : m));
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: nanoid(), role: 'assistant', content: 'ERROR: ' + err.message }]);
    } finally { setChatLoading(false); }
  };

  const handleToggleSource = async (sourceId, currentEnabled) => {
    const enabled = !currentEnabled;
    try {
      const res = await fetch('/api/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sourceId, enabled }),
      });
      if (res.ok) {
        setSources(prev => prev.map(s => s.id === sourceId ? { ...s, enabled: enabled ? 1 : 0 } : s));
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="neo-loading">LOADING RAW DATA...</div>;

  return (
    <div className="notebook-layout">
      {/* ── Topbar ── */}
      <div className="notebook-topbar">
        <button className="btn btn-ghost" onClick={() => router.push('/neo')} aria-label="Back to notebooks">
          <ArrowLeft size={24} strokeWidth={3} />
        </button>
        <h1 className="notebook-title">{notebook?.name?.toUpperCase()}</h1>
        <button className="btn btn-primary">SHARE</button>
      </div>

      {/* ── Source Panel ── */}
      <div className="source-panel">
        <div className="panel-header">
          <h2 className="panel-header-title">SOURCES</h2>
          <button className="panel-icon-btn" aria-label="Add source" onClick={() => setShowUpload(true)}>
            <Plus size={22} strokeWidth={3} />
          </button>
        </div>
        <div className="source-list">
          {sources.map(s => {
            const metadata = getSourceMetadata(s);
            const isYoutube = getSourceKind(s) === 'youtube';
            return (
              <div
                key={s.id}
                className={`source-item-neo ${s.enabled ? 'is-enabled' : ''}`}
                onClick={() => setSelectedSource(s)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedSource(s);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {isYoutube && metadata.thumbnailUrl ? (
                  <img className="source-thumb-neo" src={metadata.thumbnailUrl} alt="" />
                ) : (
                  <span className="source-icon-neo">{isYoutube ? <Video size={18} /> : <FileText size={18} />}</span>
                )}
                <span className="source-item-copy-neo">
                  <span className="source-item-name-neo">{metadata.title || s.name}</span>
                  <span className="source-item-type-neo">{isYoutube ? 'YOUTUBE' : getSourceKind(s).toUpperCase()}</span>
                </span>
                <input
                  type="checkbox"
                  checked={!!s.enabled}
                  onChange={() => handleToggleSource(s.id, !!s.enabled)}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            );
          })}
          {sources.length === 0 && <p className="source-empty-neo">NO SOURCES ADDED.</p>}
        </div>
      </div>

      {/* ── Chat Panel ── */}
      <div className="chat-panel">
        <div className="panel-header">
          <h2 className="panel-header-title">TERMINAL</h2>
        </div>

        <div className="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`message-container ${msg.role}`}>
              <div className={`message message-${msg.role}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="message-container assistant">
              <div className="message message-assistant message-thinking">
                <div className="thinking-row">
                  <Sparkles size={18} /> {thinkingMessages[thinkingStep - 1] || 'THINKING...'}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <textarea 
              className="chat-input" 
              placeholder="COMMAND THE AI..."
              value={localInput} 
              onChange={e => setLocalInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
              rows={1}
            />
            <button className="btn send-btn" onClick={handleSend} disabled={!localInput.trim() || chatLoading} aria-label="Send message">
              <ArrowRight size={24} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Studio Panel ── */}
      <div className="studio-panel">
        <div className="panel-header">
          <h2 className="panel-header-title">STUDIO</h2>
        </div>
        <div className="studio-list">
          <div className="studio-grid">
            {['AUDIO OVERVIEW', 'BRIEFING DOC', 'MIND MAP', 'QUIZ'].map(type => (
              <div key={type} className="card studio-card-neo">
                {type}
              </div>
            ))}
          </div>
          
          <div className="artifact-section">
            <h3 className="artifact-heading">SAVED ARTIFACTS</h3>
            {artifacts.map(a => (
              <div key={a.id} className="artifact-item-neo">
                <FileText size={16} />
                <span>{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showUpload && (
        <SourceUploadModal
          notebookId={id}
          onClose={() => setShowUpload(false)}
          onSuccess={(source) => {
            setSources(prev => [source, ...prev]);
            setShowUpload(false);
          }}
        />
      )}

      {selectedSource && (
        <SourceDetailModal source={selectedSource} onClose={() => setSelectedSource(null)} />
      )}
    </div>
  );
}

function SourceDetailModal({ source, onClose }) {
  const metadata = getSourceMetadata(source);
  const kind = getSourceKind(source);
  const sourceUrl = getSourceUrl(source);
  const isYoutube = kind === 'youtube';
  const title = metadata.title || source.name;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal source-detail-modal-neo" onClick={e => e.stopPropagation()}>
        <div className="modal-header-neo">
          <h2 className="modal-title">{title}</h2>
          <button className="panel-icon-btn" onClick={onClose} aria-label="Close source detail"><X size={18} /></button>
        </div>

        {isYoutube && metadata.thumbnailUrl && (
          <a className="youtube-preview-neo" href={sourceUrl} target="_blank" rel="noreferrer">
            <img src={metadata.thumbnailUrl} alt={title} />
            <span className="youtube-play-neo"><Play size={32} fill="currentColor" /></span>
          </a>
        )}

        <div className="source-meta-bar-neo">
          <span><FileText size={15} />{kind.toUpperCase()}</span>
          <span><Type size={15} />{Number(source.char_count || 0).toLocaleString()} CHARS</span>
          <span><Calendar size={15} />{new Date(source.created_at).toLocaleDateString()}</span>
        </div>

        {sourceUrl && (
          <a className="source-origin-link-neo" href={sourceUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={18} />
            {isYoutube ? 'WATCH ORIGINAL VIDEO' : 'OPEN ORIGINAL SOURCE'}
          </a>
        )}

        <div className="source-content-viewer-neo">{source.content}</div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}

function SourceUploadModal({ notebookId, onClose, onSuccess }) {
  const [tab, setTab] = useState('url');
  const [textContent, setTextContent] = useState('');
  const [textName, setTextName] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  async function handleSubmit() {
    setError('');
    setUploading(true);
    try {
      let res;
      if (tab === 'text') {
        if (!textContent.trim()) {
          setError('TEXT CONTENT REQUIRED');
          return;
        }
        res = await fetch('/api/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notebookId, type: 'text', content: textContent, name: textName || 'Text input' }),
        });
      } else if (tab === 'url') {
        if (!url.trim()) {
          setError('URL REQUIRED');
          return;
        }
        res = await fetch('/api/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notebookId, type: 'url', url }),
        });
      } else if (tab === 'pdf') {
        if (!file) {
          setError('PDF FILE REQUIRED');
          return;
        }
        const formData = new FormData();
        formData.append('notebookId', notebookId);
        formData.append('file', file);
        res = await fetch('/api/sources', { method: 'POST', body: formData });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'SOURCE ADD FAILED');
      }
      onSuccess(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header-neo">
          <h2 className="modal-title">ADD SOURCE</h2>
          <button className="panel-icon-btn" onClick={onClose} aria-label="Close source upload"><X size={18} /></button>
        </div>

        <div className="upload-tabs-neo">
          <button className={tab === 'url' ? 'is-active' : ''} onClick={() => setTab('url')} type="button">URL</button>
          <button className={tab === 'text' ? 'is-active' : ''} onClick={() => setTab('text')} type="button">TEXT</button>
          <button className={tab === 'pdf' ? 'is-active' : ''} onClick={() => setTab('pdf')} type="button">PDF</button>
        </div>

        {tab === 'url' && (
          <div className="form-group">
            <label className="form-label">URL OR YOUTUBE</label>
            <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." autoFocus />
          </div>
        )}

        {tab === 'text' && (
          <>
            <div className="form-group">
              <label className="form-label">TITLE</label>
              <input className="input" value={textName} onChange={e => setTextName(e.target.value)} placeholder="OPTIONAL" />
            </div>
            <div className="form-group">
              <label className="form-label">CONTENT</label>
              <textarea className="input textarea-neo" value={textContent} onChange={e => setTextContent(e.target.value)} placeholder="PASTE TEXT..." />
            </div>
          </>
        )}

        {tab === 'pdf' && (
          <div className="upload-dropzone-neo" onClick={() => fileInputRef.current?.click()}>
            <input type="file" ref={fileInputRef} accept=".pdf" hidden onChange={e => setFile(e.target.files?.[0])} />
            <p>{file ? file.name : 'CLICK TO SELECT PDF'}</p>
          </div>
        )}

        {error && <p className="form-error-neo">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={uploading}>{uploading ? 'ADDING...' : 'ADD'}</button>
        </div>
      </div>
    </div>
  );
}
