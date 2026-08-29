import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';

let db;

export function getDb() {
  if (db) return db;
  const dataDir = join(app.getPath('userData'), 'data');
  mkdirSync(dataDir, { recursive: true });
  db = new Database(join(dataDir, 'training-assistant.sqlite'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  seed(db);
  return db;
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      project_name TEXT NOT NULL,
      client_name TEXT,
      industry TEXT,
      audience TEXT,
      duration TEXT,
      training_goal TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      pages INTEGER DEFAULT 0,
      extracted_text TEXT DEFAULT '',
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_outputs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sources TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS export_history (
      id TEXT PRIMARY KEY,
      output_id TEXT,
      project_id TEXT,
      format TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      entity_type,
      entity_id,
      project_id,
      title,
      body
    );
  `);
}

function seed(database) {
  const count = database.prepare('SELECT COUNT(*) AS count FROM projects').get().count;
  if (count > 0) return;
  const now = new Date().toISOString();
  const id = randomUUID();
  database.prepare(`
    INSERT INTO projects (id, project_name, client_name, industry, audience, duration, training_goal, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    'Sample Leadership Enablement',
    'Acme Enterprise',
    'Technology',
    'New people managers',
    '1 day',
    'Build practical coaching, feedback, and delegation skills.',
    now,
    now
  );
  addActivity(database, id, 'Sample project created', 'Use this project to explore generators and exports.');
}

export function addActivity(database, projectId, action, detail = '') {
  database.prepare(`
    INSERT INTO activities (id, project_id, action, detail, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(randomUUID(), projectId, action, detail, new Date().toISOString());
}

export function rebuildSearchIndex(database, projectId = null) {
  if (projectId) {
    database.prepare('DELETE FROM search_index WHERE project_id = ?').run(projectId);
  } else {
    database.prepare('DELETE FROM search_index').run();
  }

  const projectWhere = projectId ? 'WHERE id = ?' : '';
  const projects = database.prepare(`SELECT * FROM projects ${projectWhere}`).all(...(projectId ? [projectId] : []));
  const insert = database.prepare(`
    INSERT INTO search_index (entity_type, entity_id, project_id, title, body)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const project of projects) {
    insert.run('project', project.id, project.id, project.project_name, [
      project.client_name,
      project.industry,
      project.audience,
      project.duration,
      project.training_goal
    ].filter(Boolean).join('\n'));
  }

  const fileWhere = projectId ? 'WHERE project_id = ?' : '';
  for (const file of database.prepare(`SELECT * FROM files ${fileWhere}`).all(...(projectId ? [projectId] : []))) {
    insert.run('file', file.id, file.project_id, file.file_name, file.extracted_text || '');
  }

  for (const output of database.prepare(`SELECT * FROM ai_outputs ${fileWhere}`).all(...(projectId ? [projectId] : []))) {
    insert.run('output', output.id, output.project_id, output.title, output.content || '');
  }

  for (const message of database.prepare(`SELECT * FROM chat_messages ${fileWhere}`).all(...(projectId ? [projectId] : []))) {
    insert.run('chat', message.id, message.project_id, message.role, message.content || '');
  }
}
