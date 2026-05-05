import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'notebooklm.db');

let _db = null;

export function getDb() {
  if (_db) return _db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      emoji TEXT DEFAULT '📓',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('text', 'pdf', 'url', 'youtube')),
      name TEXT NOT NULL,
      content TEXT,
      metadata TEXT DEFAULT '{}',
      summary TEXT DEFAULT '',
      char_count INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      citations TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      file_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
      title TEXT DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 인덱스 추가 (조회 성능 최적화)
    CREATE INDEX IF NOT EXISTS idx_sources_notebook_id ON sources(notebook_id);
    CREATE INDEX IF NOT EXISTS idx_messages_notebook_id ON messages(notebook_id);
    CREATE INDEX IF NOT EXISTS idx_artifacts_notebook_id ON artifacts(notebook_id);
    CREATE INDEX IF NOT EXISTS idx_notes_notebook_id ON notes(notebook_id);
  `);

  return _db;
}

// ──────────── Notebooks ────────────

export function listNotebooks() {
  const db = getDb();
  return db.prepare(`
    SELECT n.*, 
      (SELECT COUNT(*) FROM sources WHERE notebook_id = n.id) as source_count,
      (SELECT COUNT(*) FROM messages WHERE notebook_id = n.id) as message_count
    FROM notebooks n
    ORDER BY n.updated_at DESC
  `).all();
}

export function getNotebook(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM notebooks WHERE id = ?').get(id);
}

export function createNotebook({ id, name, emoji = '📓', description = '' }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO notebooks (id, name, emoji, description) VALUES (?, ?, ?, ?)
  `).run(id, name, emoji, description);
  return getNotebook(id);
}

export function updateNotebook(id, { name, emoji, description }) {
  const db = getDb();
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (emoji !== undefined) { fields.push('emoji = ?'); values.push(emoji); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  db.prepare(`UPDATE notebooks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getNotebook(id);
}

export function deleteNotebook(id) {
  const db = getDb();
  db.prepare('DELETE FROM notebooks WHERE id = ?').run(id);
}

// ──────────── Sources ────────────

export function listSources(notebookId) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM sources WHERE notebook_id = ? ORDER BY created_at DESC'
  ).all(notebookId);
}

export function getSource(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM sources WHERE id = ?').get(id);
}

export function createSource({ id, notebook_id, type, name, content, metadata = {}, char_count = 0 }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO sources (id, notebook_id, type, name, content, metadata, char_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, notebook_id, type, name, content, JSON.stringify(metadata), char_count);
  db.prepare('UPDATE notebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(notebook_id);
  return getSource(id);
}

export function deleteSource(id) {
  const db = getDb();
  const source = getSource(id);
  if (source) {
    db.prepare('DELETE FROM sources WHERE id = ?').run(id);
    db.prepare('UPDATE notebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(source.notebook_id);
  }
  return source;
}

export function toggleSource(id, enabled) {
  const db = getDb();
  db.prepare('UPDATE sources SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
}

// ──────────── Messages ────────────

export function listMessages(notebookId) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM messages WHERE notebook_id = ? ORDER BY created_at ASC'
  ).all(notebookId);
}

export function createMessage({ id, notebook_id, role, content, citations = [] }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO messages (id, notebook_id, role, content, citations)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, notebook_id, role, content, JSON.stringify(citations));
}

export function clearMessages(notebookId) {
  const db = getDb();
  db.prepare('DELETE FROM messages WHERE notebook_id = ?').run(notebookId);
}

// ──────────── Artifacts ────────────

export function listArtifacts(notebookId) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM artifacts WHERE notebook_id = ? ORDER BY created_at DESC'
  ).all(notebookId);
}

export function createArtifact({ id, notebook_id, type, title, content = '' }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO artifacts (id, notebook_id, type, title, content)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, notebook_id, type, title, content);
  return db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id);
}

export function deleteArtifact(id) {
  const db = getDb();
  db.prepare('DELETE FROM artifacts WHERE id = ?').run(id);
}

// ──────────── Notes ────────────

export function listNotes(notebookId) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM notes WHERE notebook_id = ? ORDER BY pinned DESC, updated_at DESC'
  ).all(notebookId);
}

export function createNote({ id, notebook_id, title = '', content = '' }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO notes (id, notebook_id, title, content)
    VALUES (?, ?, ?, ?)
  `).run(id, notebook_id, title, content);
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
}

export function updateNote(id, { title, content, pinned }) {
  const db = getDb();
  const fields = [];
  const values = [];
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (content !== undefined) { fields.push('content = ?'); values.push(content); }
  if (pinned !== undefined) { fields.push('pinned = ?'); values.push(pinned ? 1 : 0); }
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
}

export function deleteNote(id) {
  const db = getDb();
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
}
