'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { ArrowLeft, Plus, FileText, Globe, Type, Send, Trash2, BookOpen, Mic, FileQuestion, ListChecks, Clock, Sparkles, X, Hourglass, Calendar, StickyNote, ChevronDown, ChevronUp, Copy, BookmarkPlus, Video, Settings, Share2, Grid, User, Layout, Brain, FileBarChart, Table, MessageSquare, Info, ChevronRight, PenTool, MoreVertical, SlidersHorizontal, ThumbsUp, ThumbsDown, Pin, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function NotebookPage() {
  const { id } = useParams();
  const router = useRouter();
  const [notebook, setNotebook] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [localInput, setLocalInput] = useState('');
  const [thinkingStep, setThinkingStep] = useState(0);
  const [citations, setCitations] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState({ connected: false, latency: '', model: '' });
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [notes, setNotes] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [artifacts, setArtifacts] = useState([]);
  const [generatingArtifact, setGeneratingArtifact] = useState(null);
  const [viewingArtifact, setViewingArtifact] = useState(null);
  const messagesEndRef = useRef(null);

  const thinkingMessages = [
    "노트북 컨텍스트 준비 중...",
    "관련 문서 검색 중...",
    "가장 연관성 높은 구절 추출 중...",
    "검색된 정보를 분석 중...",
    "답변 생성 중...",
  ];

  // ── Health Check ──
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (data.status === 'ok') {
          setOllamaStatus({ connected: true, latency: data.ollama.latency, model: data.model.name });
          const chatModels = (data.availableModels || []).filter(m =>
            !m.includes('nomic-') && !m.includes('all-minilm') && !m.includes('mxbai-embed')
          );
          setAvailableModels(chatModels);
          if (!selectedModel && data.model.name) setSelectedModel(data.model.name);
        } else {
          setOllamaStatus({ connected: false, latency: '', model: '' });
        }
      } catch { setOllamaStatus({ connected: false, latency: '', model: '' }); }
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  // ── Load Notebook ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/notebooks/${id}`);
        if (!res.ok) { router.push('/'); return; }
        const data = await res.json();
        setNotebook(data);
        setSources(data.sources || []);
        setArtifacts(data.artifacts || []);
        setNotes(data.notes || []);
        if (data.messages?.length) {
          setMessages(data.messages.map(m => ({ id: m.id, role: m.role, content: m.content })));
        }
      } catch { router.push('/'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Thinking animation ──
  useEffect(() => {
    if (chatLoading) {
      const interval = setInterval(() => {
        setThinkingStep(prev => (prev < thinkingMessages.length ? prev + 1 : prev));
      }, 1500);
      return () => clearInterval(interval);
    } else { setThinkingStep(0); }
  }, [chatLoading]);

  // ── Chat ──
  const handleSend = async (e, directText = null) => {
    if (e) e.preventDefault();
    const content = directText || localInput;
    if (!content.trim() || chatLoading) return;
    if (!directText) setLocalInput('');
    setChatLoading(true);
    setThinkingStep(1);

    const userMsg = { id: nanoid(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch(`/api/chat?notebookId=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], notebookId: id, model: selectedModel }),
      });
      if (!response.ok) throw new Error('서버 응답 에러');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const aId = nanoid();
      setMessages(prev => [...prev, { id: aId, role: 'assistant', content: '' }]);
      setThinkingStep(3);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          const t = line.trim();
          if (!t) continue;
          if (t.startsWith('0:')) {
            try { assistantContent += JSON.parse(t.substring(2)); } catch {}
          } else if (t.includes(':') && t.charAt(1) === ':') { continue; }
          else { assistantContent += t + '\n'; }
          setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: assistantContent.trim() } : m));
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: nanoid(), role: 'assistant', content: '오류: ' + err.message }]);
    } finally { setChatLoading(false); setThinkingStep(0); }
  };

  const handleToggle = async (sourceId, currentEnabled) => {
    const newEnabled = !currentEnabled;
    try {
      const res = await fetch('/api/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sourceId, enabled: newEnabled }),
      });
      if (res.ok) setSources(prev => prev.map(s => s.id === sourceId ? { ...s, enabled: newEnabled ? 1 : 0 } : s));
    } catch {}
  };

  const handleDeleteSource = async (sourceId) => {
    try {
      await fetch(`/api/sources?id=${sourceId}`, { method: 'DELETE' });
      setSources(prev => prev.filter(s => s.id !== sourceId));
    } catch {}
  };

  const handleGenerateArtifact = async (type) => {
    if (generatingArtifact || sources.length === 0) return;
    setGeneratingArtifact(type);
    try {
      const res = await fetch('/api/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notebookId: id, type, model: selectedModel }),
      });
      if (res.ok) {
        const artifact = await res.json();
        setArtifacts(prev => [artifact, ...prev]);
        setViewingArtifact(artifact);
      }
    } catch {}
    finally { setGeneratingArtifact(null); }
  };

  const handleAddNote = async (content = '') => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notebookId: id, title: '', content: content || '새 노트' }),
      });
      if (res.ok) {
        const note = await res.json();
        setNotes(prev => [note, ...prev]);
        setShowNotes(true);
      }
    } catch {}
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await fetch(`/api/notes?id=${noteId}`, { method: 'DELETE' });
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch {}
  };

  if (loading) return <div className="notebook-layout"><div className="notebook-topbar" /></div>;

  return (
    <div className="notebook-layout">
      {/* ── Topbar ── */}
      <div className="notebook-topbar">
        <div className="notebook-topbar-title" style={{ gap: '12px' }}>
          <div style={{ backgroundColor: '#000', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Sparkles size={18} />
          </div>
          <span style={{ fontSize: '1.125rem', fontWeight: '500', color: '#1f1f1f' }}>{notebook?.name || '노트북'}</span>
        </div>
        <div className="notebook-topbar-spacer" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn" style={{ borderRadius: '100px', padding: '8px 20px', background: '#000', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> 노트북 만들기
          </button>
          <button className="btn btn-ghost btn-icon" title="공유"><Share2 size={20} color="#444746" /></button>
          <button className="btn btn-ghost btn-icon" title="설정"><Settings size={20} color="#444746" /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8f9fa', padding: '4px 8px', borderRadius: '8px', border: '1px solid #dee2e6', cursor: 'pointer' }}>
             <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#444746' }}>PRO</span>
          </div>
          <button className="btn btn-ghost btn-icon"><Grid size={20} color="#444746" /></button>
          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#0b57d0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600', marginLeft: '4px' }}>
            J
          </div>
        </div>
      </div>

      {/* ── Source Panel ── */}
      <div className="source-panel">
        <div className="panel-header">
          <span className="panel-header-title">출처</span>
          <button className="btn btn-ghost btn-icon" title="접기"><Layout size={18} /></button>
        </div>
        <div className="source-list" style={{ padding: '0 16px 16px' }}>
          <div style={{ padding: '12px 0 20px' }}>
            <button 
              className="btn" 
              onClick={() => setShowUpload(true)}
              style={{ width: '100%', borderRadius: '100px', border: '1px solid #dee2e6', padding: '10px', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#1f1f1f', background: '#fff' }}
            >
              <Plus size={18} color="#0b57d0" /> 소스 추가
            </button>
          </div>
          
          <div className="source-search-container" style={{ position: 'relative', marginBottom: '16px' }}>
            <div style={{ background: '#f8f9fa', borderRadius: '100px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #dee2e6' }}>
              <Globe size={16} color="#444746" />
              <input type="text" placeholder="웹에서 새 소스를 검색하세요" style={{ background: 'none', border: 'none', outline: 'none', fontSize: '0.85rem', flex: 1 }} />
              <ArrowRight size={16} color="#444746" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#444746' }}>모두 선택</div>
            <input type="checkbox" checked readOnly style={{ width: 16, height: 16, accentColor: '#0b57d0' }} />
          </div>

          {sources.length === 0 ? (
            <div className="source-empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <FileText size={32} color="#dee2e6" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.85rem', color: '#444746' }}>소스를 추가하여 시작하세요</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sources.map(source => (
                <div key={source.id} className="source-item-mini" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 4px', cursor: 'pointer' }}>
                  <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {source.type === 'url' && source.url?.includes('youtube') ? <Video size={16} color="#d93025" /> : <Globe size={16} color="#0b57d0" />}
                  </div>
                  <span style={{ fontSize: '0.85rem', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1f1f1f' }}>
                    {source.name}
                  </span>
                  <input type="checkbox" checked={!!source.enabled} onChange={() => handleToggle(source.id, !!source.enabled)} style={{ width: 16, height: 16, accentColor: '#0b57d0' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Chat Panel ── */}
      <div className="chat-panel">
        <div className="panel-header">
          <span className="panel-header-title">채팅</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn btn-ghost btn-icon"><SlidersHorizontal size={18} color="#444746" /></button>
            <button className="btn btn-ghost btn-icon"><MoreVertical size={18} color="#444746" /></button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty" style={{ padding: '120px 40px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '500', color: '#1f1f1f', marginBottom: '12px' }}>무엇이든 물어보세요</h2>
              <p style={{ color: '#444746' }}>소스 자료를 기반으로 정확한 답변을 드립니다</p>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <div key={msg.id} className={`message-container ${msg.role}`}>
                  <div className={`message message-${msg.role}`}>
                    <div className="message-content">
                      {msg.role === 'assistant' ? (
                        <>
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({children}) => <p style={{marginBottom: '16px'}}>{children}</p>,
                              li: ({children}) => <li style={{marginBottom: '8px'}}>{children}</li>,
                              strong: ({children}) => <strong style={{fontWeight: 700}}>{children}</strong>
                            }}
                          >
                            {msg.content || ''}
                          </ReactMarkdown>
                          
                          <div className="message-actions-bar">
                            <button className="action-btn-pill" onClick={() => handleAddNote(msg.content)}>
                              <Pin size={16} color="#0b57d0" /> 메모에 저장
                            </button>
                            <div className="action-btn-icon" onClick={() => navigator.clipboard.writeText(msg.content)} title="복사">
                              <Copy size={18} />
                            </div>
                            <div className="action-btn-icon" title="도움됨">
                              <ThumbsUp size={18} />
                            </div>
                            <div className="action-btn-icon" title="도움 안됨">
                              <ThumbsDown size={18} />
                            </div>
                          </div>
                        </>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="chat-timestamp">오늘 • 오전 12:42</div>
            </>
          )}
          {chatLoading && (
            <div className="message-container assistant">
              <div className="message message-assistant" style={{ fontStyle: 'italic', color: '#444746' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Sparkles size={14} className="thinking-dots" />
                   {thinkingMessages[thinkingStep - 1] || '생각 중...'}
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
              placeholder="입력을 시작하세요..."
              value={localInput} 
              onChange={e => {
                setLocalInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
              rows={1} 
            />
            <div className="chat-input-actions">
              <div className="source-indicator-btn">
                소스 {sources.filter(s => s.enabled).length}개
              </div>
              <button className="chat-send-btn-circle" onClick={handleSend} disabled={!localInput.trim() || chatLoading}>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
          <p className="chat-footer-text">
            NotebookLM이 부정확한 정보를 표시할 수 있으므로 대답을 다시 한번 확인하세요.
          </p>
        </div>
      </div>

      {/* ── Studio Panel ── */}
      <div className="studio-panel">
        <div className="panel-header">
          <span className="panel-header-title">스튜디오</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn btn-ghost btn-icon"><Layout size={18} color="#444746" /></button>
          </div>
        </div>
        <div className="studio-list" style={{ padding: '12px 16px' }}>
          <div className="studio-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
            {[
              { id: 'audio', title: 'AI 오디오 오버뷰', icon: <Sparkles size={16} />, color: '#0b57d0', bg: '#e8f0fe' },
              { id: 'slide', title: '슬라이드 자료', icon: <Layout size={16} />, color: '#b06000', bg: '#fef7e0' },
              { id: 'video', title: '동영상 개요', icon: <Video size={16} />, color: '#137333', bg: '#e6f4ea' },
              { id: 'mindmap', title: '마인드맵', icon: <Brain size={16} />, color: '#d93025', bg: '#fce8e6' },
              { id: 'report', title: '보고서', icon: <FileBarChart size={16} />, color: '#9333ea', bg: '#f3e8fd' },
              { id: 'quiz', title: '퀴즈', icon: <FileQuestion size={16} />, color: '#1967d2', bg: '#e8f0fe' }
            ].map(item => (
              <div key={item.id} className="studio-card-mini" style={{ background: item.bg, color: item.color, padding: '12px', borderRadius: '12px', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '84px' }} onClick={() => handleGenerateArtifact(item.id)}>
                <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', lineHeight: '1.2', color: item.color }}>{item.title}</div>
                <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: 20, height: 20, background: 'rgba(255,255,255,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>

          <div className="artifact-list">
             <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#444746', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Pin size={12} /> 고정된 메모
             </div>
            {artifacts.map(a => (
              <div key={a.id} className="artifact-item" onClick={() => setViewingArtifact(a)}>
                <div className="artifact-item-icon" style={{ color: '#9333ea', background: '#f3e8fd' }}>
                   <StickyNote size={16} />
                </div>
                <div className="artifact-item-info">
                  <div className="artifact-item-title">{a.title}</div>
                  <div className="artifact-item-meta">소스 {sources.filter(s => s.enabled).length}개 • {new Date(a.created_at).toLocaleDateString()}</div>
                </div>
                <button className="btn btn-ghost btn-icon"><MoreVertical size={16} color="#444746" /></button>
              </div>
            ))}
            {notes.map(n => (
              <div key={n.id} className="artifact-item" onClick={() => setViewingArtifact(n)}>
                <div className="artifact-item-icon" style={{ color: '#b06000', background: '#fef7e0' }}>
                   <PenTool size={16} />
                </div>
                <div className="artifact-item-info">
                  <div className="artifact-item-title">{n.title || n.content?.substring(0, 20)}</div>
                  <div className="artifact-item-meta">{new Date(n.created_at).toLocaleDateString()}</div>
                </div>
                <button className="btn btn-ghost btn-icon"><MoreVertical size={16} color="#444746" /></button>
              </div>
            ))}
            {!artifacts.length && !notes.length && (
              <div className="artifact-item">
                <div className="artifact-item-icon" style={{ color: '#0b57d0', background: '#e8f0fe' }}>
                   <Brain size={16} />
                </div>
                <div className="artifact-item-info">
                  <div className="artifact-item-title">The Agentic Blueprint</div>
                  <div className="artifact-item-meta">소스 1개 • 13시간 전</div>
                </div>
                <button className="btn btn-ghost btn-icon"><MoreVertical size={16} color="#444746" /></button>
              </div>
            )}
          </div>
        </div>

        <div className="floating-add-note" onClick={() => handleAddNote()} style={{ position: 'absolute', bottom: '24px', right: '24px', background: '#1f1f1f', color: '#fff', padding: '10px 20px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <PenTool size={18} /> 메모 추가
        </div>
      </div>

      {/* ── Modals ── */}
      {showUpload && <SourceUploadModal notebookId={id} onClose={() => setShowUpload(false)} onSuccess={(source) => { setSources(prev => [source, ...prev]); setShowUpload(false); }} />}
      
      {selectedSource && (
        <div className="modal-overlay" onClick={() => setSelectedSource(null)}>
          <div className="modal source-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedSource.name}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedSource(null)}><X size={18} /></button>
            </div>
            <div className="source-meta-bar">
              <div className="meta-item"><FileText size={14} />{selectedSource.type.toUpperCase()}</div>
              <div className="meta-item"><Type size={14} />{selectedSource.char_count?.toLocaleString()}자</div>
              <div className="meta-item"><Calendar size={14} />{new Date(selectedSource.created_at).toLocaleDateString()}</div>
            </div>
            <div className="source-content-viewer">{selectedSource.content}</div>
            <div className="modal-actions"><button className="btn btn-primary" onClick={() => setSelectedSource(null)}>닫기</button></div>
          </div>
        </div>
      )}

      {viewingArtifact && (
        <div className="modal-overlay" onClick={() => setViewingArtifact(null)}>
          <div className="modal source-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{viewingArtifact.title}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setViewingArtifact(null)}><X size={18} /></button>
            </div>
            <div className="artifact-viewer">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingArtifact.content || ''}</ReactMarkdown>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => navigator.clipboard.writeText(viewingArtifact.content)}>복사</button>
              <button className="btn btn-primary" onClick={() => setViewingArtifact(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceUploadModal({ notebookId, onClose, onSuccess }) {
  const [tab, setTab] = useState('text');
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
        if (!textContent.trim()) { setError('텍스트를 입력하세요'); setUploading(false); return; }
        res = await fetch('/api/sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notebookId, type: 'text', content: textContent, name: textName || '텍스트 입력' }) });
      } else if (tab === 'url') {
        if (!url.trim()) { setError('URL을 입력하세요'); setUploading(false); return; }
        res = await fetch('/api/sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notebookId, type: 'url', url }) });
      } else if (tab === 'pdf') {
        if (!file) { setError('PDF 파일을 선택하세요'); setUploading(false); return; }
        const formData = new FormData();
        formData.append('notebookId', notebookId);
        formData.append('file', file);
        res = await fetch('/api/sources', { method: 'POST', body: formData });
      }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || '업로드 실패'); }
      onSuccess(await res.json());
    } catch (e) { setError(e.message); } finally { setUploading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">소스 추가</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="upload-tabs">
          <button className={`upload-tab ${tab === 'text' ? 'active' : ''}`} onClick={() => setTab('text')}>텍스트</button>
          <button className={`upload-tab ${tab === 'url' ? 'active' : ''}`} onClick={() => setTab('url')}>URL</button>
          <button className={`upload-tab ${tab === 'pdf' ? 'active' : ''}`} onClick={() => setTab('pdf')}>PDF</button>
        </div>
        {tab === 'text' && (
          <>
            <div className="form-group"><label className="form-label">제목</label><input className="input" value={textName} onChange={e => setTextName(e.target.value)} placeholder="선택 사항" /></div>
            <div className="form-group"><label className="form-label">내용</label><textarea className="input" value={textContent} onChange={e => setTextContent(e.target.value)} style={{ minHeight: 180 }} placeholder="텍스트를 붙여넣으세요..." /></div>
          </>
        )}
        {tab === 'url' && (
          <div className="form-group"><label className="form-label">URL</label><input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/article" /></div>
        )}
        {tab === 'pdf' && (
          <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}>
            <input type="file" ref={fileInputRef} accept=".pdf" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0])} />
            {file ? <p>📄 {file.name}</p> : <p>클릭하여 PDF 파일 선택</p>}
          </div>
        )}
        {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: 8 }}>{error}</p>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={uploading}>{uploading ? '처리 중...' : '추가'}</button>
        </div>
      </div>
    </div>
  );
}
