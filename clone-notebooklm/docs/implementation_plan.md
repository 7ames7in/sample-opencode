# Google NotebookLM Clone — 완벽 복제

기존 `my-notebooklm`의 검증된 백엔드를 기반으로, **실제 Google NotebookLM의 UI/UX를 1:1로 재현**하는 프리미엄 웹앱.

---

## User Review Required

> [!IMPORTANT]
> **기존 프로젝트와의 관계**: `my-notebooklm`의 핵심 백엔드 로직(RAG, 벡터, 청킹, 파서)은 검증 완료 상태. 이를 리팩토링하여 `clone-notebooklm`에 재구축합니다.

> [!WARNING]
> **사전 요구사항**: Ollama 실행 + `gemma4` / `nomic-embed-text` 모델 설치 필요
> ```bash
> ollama pull gemma4
> ollama pull nomic-embed-text
> ```

---

## 기술 스택 (모두 무료/오픈소스)

| 레이어 | 기술 | 라이선스 |
|--------|------|----------|
| **프레임워크** | Next.js 16 (App Router) | MIT |
| **AI SDK** | Vercel AI SDK (`ai`, `@ai-sdk/openai-compatible`) | Apache 2.0 |
| **LLM** | Ollama — Gemma 4 | MIT / Apache 2.0 |
| **임베딩** | Ollama `nomic-embed-text` | Apache 2.0 |
| **벡터 검색** | 로컬 파일 기반 (cosine similarity) | 자체 구현 |
| **메타 DB** | Better-SQLite3 | MIT |
| **문서 파싱** | `pdf-parse`, `cheerio` | MIT |
| **UI** | React 19 + Vanilla CSS | MIT |
| **아이콘** | Lucide React | ISC |
| **마크다운** | `react-markdown` + `remark-gfm` | MIT |

---

## 핵심 기능 (2 Phase 집중)

### Phase 1 — 완전한 MVP (이번 구현 범위)
- [x] Next.js 프로젝트 초기화
- [ ] **홈 화면**: Google NotebookLM 스타일 노트북 목록 (카드 그리드)
- [ ] **노트북 CRUD**: 생성/이름변경/삭제
- [ ] **3-Panel 레이아웃**: 소스 | 채팅 | 스튜디오
- [ ] **소스 관리**: 텍스트 입력, PDF 업로드, URL 크롤링
- [ ] **소스 활성화/비활성화** (채팅 범위 제어)
- [ ] **소스 상세보기** (원문 뷰어)
- [ ] **RAG 채팅**: 스트리밍 응답 + 인용(citation) 표시
- [ ] **마크다운 렌더링**: AI 응답을 마크다운으로 렌더링
- [ ] **Thinking UX**: AI 사고 과정 애니메이션
- [ ] **Studio 패널**: Briefing Doc, FAQ, Study Guide, Timeline 생성
- [ ] **노트 기능**: 채팅에서 "노트에 저장", 노트 CRUD
- [ ] **Google NotebookLM 동일 디자인**: 라이트 모드, Google Blue 컬러 체계
- [ ] **Ollama 상태 표시**: 연결 상태 + 모델 정보 실시간 표시

### Phase 2 — 고급 기능 (추후)
- [ ] Audio Overview (TTS — Kokoro.js)
- [ ] YouTube 트랜스크립트 소스
- [ ] 소스 자동 요약
- [ ] 채팅 기록 관리 (리셋/삭제)
- [ ] 설정 UI (모델 선택)

---

## 프로젝트 구조

```
clone-notebooklm/
├── app/
│   ├── layout.js                    # 루트 레이아웃 + Google Fonts
│   ├── page.js                      # 홈: 노트북 목록
│   ├── globals.css                  # 디자인 시스템 (Google NotebookLM 동일)
│   ├── notebook/
│   │   └── [id]/
│   │       └── page.js              # 3-Panel 노트북 뷰
│   └── api/
│       ├── health/route.js          # Ollama 헬스 체크
│       ├── notebooks/
│       │   ├── route.js             # GET (목록), POST (생성)
│       │   └── [id]/route.js        # GET, PUT, DELETE
│       ├── sources/route.js         # CRUD + 인제스트
│       ├── chat/route.js            # 스트리밍 RAG 채팅
│       ├── studio/route.js          # 아티팩트 생성
│       └── notes/route.js           # 노트 CRUD
├── components/
│   ├── NotebookCard.js              # 홈 카드
│   ├── SourcePanel.js               # 소스 패널 (좌측)
│   ├── ChatPanel.js                 # 채팅 패널 (중앙)
│   ├── StudioPanel.js               # 스튜디오 패널 (우측)
│   ├── SourceUploadModal.js         # 소스 업로드 모달
│   ├── SourceDetailModal.js         # 소스 상세 뷰어
│   ├── NotePanel.js                 # 하단 노트 패널
│   └── ChatMessage.js               # 채팅 메시지 (마크다운 + 인용)
├── lib/
│   ├── db.js                        # SQLite 초기화 + CRUD
│   ├── vector.js                    # 로컬 벡터 검색
│   ├── embeddings.js                # Ollama 임베딩
│   ├── chunker.js                   # 텍스트 청킹
│   ├── rag.js                       # RAG 파이프라인
│   ├── llm.js                       # LLM 프로바이더
│   └── parsers/
│       ├── pdf.js                   # PDF → 텍스트
│       ├── url.js                   # URL → 텍스트
│       └── text.js                  # 직접 입력
├── data/                            # 런타임 데이터 (gitignored)
├── .env.local
├── .gitignore
├── package.json
├── jsconfig.json
├── next.config.mjs
└── README.md
```

---

## Proposed Changes

### 1. 프로젝트 초기화

#### [NEW] package.json
Next.js 16 + 핵심 의존성. `my-notebooklm`과 동일 스택 + `react-markdown`, `remark-gfm` 추가.

#### [NEW] .env.local
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

#### [NEW] next.config.mjs
`better-sqlite3`, `pdf-parse`를 serverExternalPackages로 설정.

#### [NEW] jsconfig.json
`@/` alias 설정.

#### [NEW] .gitignore
`data/`, `node_modules/`, `.next/` 등.

---

### 2. 백엔드 (lib/) — my-notebooklm 기반 리팩토링

#### [NEW] lib/db.js
- `my-notebooklm`의 검증된 스키마 재사용
- notebooks, sources, messages, artifacts, notes 테이블
- 모든 CRUD 헬퍼 함수

#### [NEW] lib/vector.js
- 파일 기반 벡터 저장소 (ChromaDB 불필요)
- cosine similarity 검색
- `my-notebooklm`과 동일 구현

#### [NEW] lib/embeddings.js
- Ollama `nomic-embed-text` 모델 사용
- `embed()`, `embedBatch()` 함수

#### [NEW] lib/chunker.js
- 500자 청크 + 100자 오버랩
- 문단/문장 경계 우선

#### [NEW] lib/rag.js
- `retrieve()`: 벡터 검색 + 컨텍스트 포맷
- `buildSystemPrompt()`: 인용 포함 프롬프트

#### [NEW] lib/llm.js
- Vercel AI SDK + Ollama OpenAI-compatible 프로바이더

#### [NEW] lib/parsers/pdf.js, url.js, text.js
- 기존 파서 동일 구현

---

### 3. API Routes

#### [NEW] app/api/health/route.js
Ollama 서버 + 모델 상태 확인.

#### [NEW] app/api/notebooks/route.js
GET (목록), POST (생성).

#### [NEW] app/api/notebooks/[id]/route.js
GET (상세 + 소스 + 메시지), PUT (수정), DELETE (cascade).

#### [NEW] app/api/sources/route.js
GET, POST (텍스트/PDF/URL 인제스트), PATCH (토글), DELETE.

#### [NEW] app/api/chat/route.js
POST — RAG 검색 → LLM 스트리밍 → 인용 헤더.

#### [NEW] app/api/studio/route.js
POST — 아티팩트 타입별 LLM 프롬프트로 생성 (briefing, faq, study_guide, timeline).

#### [NEW] app/api/notes/route.js
GET, POST, PUT, DELETE — 노트 CRUD.

---

### 4. 프론트엔드 — Google NotebookLM 1:1 복제

#### [NEW] app/globals.css
- **Google NotebookLM 정확한 컬러 체계**: `#0b57d0` Primary Blue, `#f9fafb` Background
- Google Material Design 3 영감의 깔끔한 라이트 모드
- 3-Panel grid 레이아웃 (280px | 1fr | 300px)
- 글래스 효과 모달, 부드러운 트랜지션
- 스켈레톤 로딩, 스크롤바 스타일링
- 반응형 breakpoint (1200px, 768px)
- 마크다운 렌더링 스타일

#### [NEW] app/layout.js
- `Inter` 폰트 (Google Fonts)
- SEO 메타데이터

#### [NEW] app/page.js (홈 화면)
- 노트북 카드 그리드
- 생성 모달 (이모지 + 이름)
- 빈 상태 CTA

#### [NEW] app/notebook/[id]/page.js (핵심 뷰)
- 3-Panel 레이아웃 오케스트레이션
- 데이터 fetch + 상태 관리
- 패널 간 통신

#### [NEW] components/SourcePanel.js
- 소스 목록 (체크박스 토글)
- "+ 소스 추가" 버튼
- 빈 상태 안내
- 소스 클릭 시 상세 뷰어 열기

#### [NEW] components/ChatPanel.js
- 스트리밍 채팅 UI
- 마크다운 렌더링 (`react-markdown`)
- 인용 배지 표시
- Thinking 애니메이션 (단계별)
- 빈 상태 + 추천 질문
- 텍스트 입력 + Enter 전송

#### [NEW] components/StudioPanel.js
- Audio Overview 섹션 (Phase 2 placeholder)
- 문서 생성: Briefing Doc, FAQ, Study Guide, Timeline
- 생성 버튼 클릭 → API 호출 → 결과 모달 표시

#### [NEW] components/SourceUploadModal.js
- 탭: 텍스트 | URL | PDF
- 파일 드래그앤드롭 영역
- 업로드 진행 표시
- 에러 처리

#### [NEW] components/SourceDetailModal.js
- 소스 메타데이터 (타입, 글자수, 날짜, URL)
- 원문 텍스트 뷰어

#### [NEW] components/NotePanel.js
- 하단 접이식 노트 영역
- 노트 추가/편집/삭제
- 채팅에서 "노트에 저장" 연동

#### [NEW] components/ChatMessage.js
- 마크다운 렌더링 컴포넌트
- 인용 번호 하이라이트
- 복사 버튼

---

## UI 디자인 상세

### 3-Panel 레이아웃
```
┌─────────────────────────────────────────────────────────────┐
│  [← 홈]  📓 노트북 이름              [✨ gemma4 (12ms)] [⚙]│
├──────────────┬────────────────────────┬─────────────────────┤
│  📄 소스     │     💬 채팅            │   📋 스튜디오       │
│              │                        │                     │
│ [+ 소스 추가] │  AI 응답 (마크다운)     │  🔊 Audio Overview  │
│              │  인용 [1] [2] 배지      │  [생성하기]          │
│ ✅ 소스 1    │                        │                     │
│ ✅ 소스 2    │                        │  ─── 문서 생성 ───  │
│ □  소스 3    │                        │  📝 Briefing Doc    │
│              │                        │  ❓ FAQ             │
│              │                        │  📚 Study Guide     │
│              │  ┌──────────────────┐  │  🕐 Timeline       │
│              │  │ 질문을 입력하세요   │  │                     │
│              │  └──────────────────┘  │                     │
├──────────────┴────────────────────────┴─────────────────────┤
│  📝 노트 (하단 접이식)                                       │
└─────────────────────────────────────────────────────────────┘
```

### 컬러 시스템 (Google NotebookLM 동일)
```css
--bg-main: #f9fafb;        /* 메인 배경 */
--bg-panel: #ffffff;       /* 패널 배경 */
--primary: #0b57d0;        /* Google Blue */
--primary-light: #e8f0fe;  /* 선택된 항목 배경 */
--text-main: #1f1f1f;
--text-muted: #5f6368;
--border: #dadce0;
```

---

## Verification Plan

### 자동 테스트
1. `npm install && npm run dev` — 정상 구동
2. 브라우저 테스트: 노트북 생성 → 소스 추가 → 채팅 E2E
3. Studio 아티팩트 생성 테스트

### 수동 검증
1. 실제 Google NotebookLM UI와 비교 스크린샷
2. PDF 업로드 → 텍스트 추출 확인
3. RAG 인용 정확성 확인
4. 스트리밍 응답 + Thinking 애니메이션 확인

### 사전 조건
```bash
# Ollama 실행 + 모델 설치
ollama pull gemma4
ollama pull nomic-embed-text
```
