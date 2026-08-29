import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { getDb, addActivity, rebuildSearchIndex } from './database.js';
import { getSettings, saveSettings } from './settings.js';
import { importDocument, supportedExtensions } from './documentParser.js';
import { exportContent } from './exportService.js';
import {
  chatWithDocuments,
  createAssignments,
  generateExercises,
  generateLessonPlan,
  generateQuiz,
  generateTrainerNotes,
  summarizeDocument,
  testAiConnection
} from './geminiService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    title: 'AI Corporate Training Assistant',
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  Menu.setApplicationMenu(buildMenu());

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    if (process.env.ELECTRON_VERIFY_RENDER) {
      console.log(`[renderer:${level}] ${message}`);
    }
  });

  mainWindow.webContents.on('did-finish-load', async () => {
    if (!process.env.ELECTRON_VERIFY_RENDER) return;
    const state = await mainWindow.webContents.executeJavaScript(`
      ({
        title: document.title,
        rootChildren: document.querySelector('#root')?.children.length || 0,
        bodyText: document.body.innerText.slice(0, 500),
        hasBridge: Boolean(window.assistantAPI)
      })
    `);
    console.log('RENDER_STATE ' + JSON.stringify(state));
    app.quit();
  });
}

app.whenReady().then(() => {
  getDb();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu:new-project') },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => mainWindow.webContents.send('menu:settings') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }]
    },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }]
    }
  ]);
}

function ok(fn) {
  return async (_event, payload) => {
    try {
      return { ok: true, data: await fn(payload) };
    } catch (error) {
      return { ok: false, error: error.message || 'Unexpected error' };
    }
  };
}

ipcMain.handle('app:meta', ok(() => ({ userData: app.getPath('userData'), version: app.getVersion() })));
ipcMain.handle('settings:get', ok(() => {
  const settings = getSettings();
  return {
    ...settings,
    hasApiKey: Boolean(settings.geminiApiKey || settings.claudeApiKey || settings.openaiApiKey || settings.huggingfaceApiKey || settings.openrouterApiKey)
  };
}));
ipcMain.handle('settings:save', ok((settings) => saveSettings(settings)));
ipcMain.handle('settings:test', ok(() => testAiConnection()));

ipcMain.handle('projects:list', ok(() => {
  return getDb().prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
}));

ipcMain.handle('projects:get', ok((id) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!project) throw new Error('Project not found');
  return {
    ...project,
    files: db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY uploaded_at DESC').all(id),
    outputs: db.prepare('SELECT * FROM ai_outputs WHERE project_id = ? ORDER BY updated_at DESC').all(id),
    chat: db.prepare('SELECT * FROM chat_messages WHERE project_id = ? ORDER BY created_at ASC').all(id)
  };
}));

ipcMain.handle('projects:create', ok((project) => {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO projects (id, project_name, client_name, industry, audience, duration, training_goal, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, project.project_name, project.client_name, project.industry, project.audience, project.duration, project.training_goal, now, now);
  addActivity(db, id, 'Project created', project.project_name);
  rebuildSearchIndex(db, id);
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}));

ipcMain.handle('projects:update', ok((project) => {
  const db = getDb();
  db.prepare(`
    UPDATE projects
    SET project_name = ?, client_name = ?, industry = ?, audience = ?, duration = ?, training_goal = ?, updated_at = ?
    WHERE id = ?
  `).run(project.project_name, project.client_name, project.industry, project.audience, project.duration, project.training_goal, new Date().toISOString(), project.id);
  addActivity(db, project.id, 'Project updated', project.project_name);
  rebuildSearchIndex(db, project.id);
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id);
}));

ipcMain.handle('projects:duplicate', ok((id) => {
  const db = getDb();
  const source = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!source) throw new Error('Project not found');
  const newId = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(newId, `${source.project_name} Copy`, source.client_name, source.industry, source.audience, source.duration, source.training_goal, now, now);
  for (const output of db.prepare('SELECT * FROM ai_outputs WHERE project_id = ?').all(id)) {
    db.prepare('INSERT INTO ai_outputs VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), newId, output.type, output.title, output.content, now, now);
  }
  addActivity(db, newId, 'Project duplicated', source.project_name);
  rebuildSearchIndex(db, newId);
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(newId);
}));

ipcMain.handle('projects:delete', ok((id) => {
  const db = getDb();
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  db.prepare('DELETE FROM search_index WHERE project_id = ?').run(id);
  addActivity(db, null, 'Project deleted', id);
  return true;
}));

ipcMain.handle('projects:export', ok((id) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  const files = db.prepare('SELECT file_name, file_size, pages, uploaded_at FROM files WHERE project_id = ?').all(id);
  const outputs = db.prepare('SELECT type, title, created_at FROM ai_outputs WHERE project_id = ?').all(id);
  const data = JSON.stringify({ project, files, outputs }, null, 2);
  const path = join(app.getPath('documents'), `${project.project_name.replace(/[^\w-]+/g, '-')}-export.json`);
  writeFileSync(path, data, 'utf8');
  shell.showItemInFolder(path);
  return path;
}));

ipcMain.handle('projects:import', ok(async () => {
  const result = await dialog.showOpenDialog(mainWindow, { filters: [{ name: 'Project JSON', extensions: ['json'] }], properties: ['openFile'] });
  if (result.canceled) return null;
  const payload = JSON.parse(readFileSync(result.filePaths[0], 'utf8'));
  return payload.project;
}));

ipcMain.handle('files:upload', ok(async (projectId) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Training Files', extensions: supportedExtensions.map((ext) => ext.slice(1)) }]
  });
  if (result.canceled) return [];
  const db = getDb();
  const uploaded = [];
  for (const path of result.filePaths) {
    const file = await importDocument(projectId, path);
    db.prepare(`
      INSERT INTO files (id, project_id, file_name, file_path, file_size, file_type, pages, extracted_text, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(file.id, projectId, file.fileName, file.filePath, file.fileSize, file.fileType, file.pages, file.extractedText, new Date().toISOString());
    uploaded.push(file);
  }
  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), projectId);
  addActivity(db, projectId, 'Files uploaded', `${uploaded.length} file(s)`);
  rebuildSearchIndex(db, projectId);
  return uploaded;
}));

ipcMain.handle('files:list', ok((projectId) => getDb().prepare('SELECT * FROM files WHERE project_id = ? ORDER BY uploaded_at DESC').all(projectId)));
ipcMain.handle('files:recent', ok(() => getDb().prepare('SELECT * FROM files ORDER BY uploaded_at DESC LIMIT 8').all()));
ipcMain.handle('files:remove', ok((id) => {
  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
  db.prepare('DELETE FROM files WHERE id = ?').run(id);
  if (file) rebuildSearchIndex(db, file.project_id);
  return true;
}));

ipcMain.handle('outputs:list', ok((projectId) => getDb().prepare('SELECT * FROM ai_outputs WHERE project_id = ? ORDER BY updated_at DESC').all(projectId)));
ipcMain.handle('outputs:save', ok((payload) => saveOutput(payload.projectId, payload.type, payload.title, payload.content)));
ipcMain.handle('outputs:export', ok(async (payload) => {
  const filePath = await exportContent(payload);
  const db = getDb();
  db.prepare('INSERT INTO export_history VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), payload.outputId || null, payload.projectId || null, payload.format, filePath, new Date().toISOString());
  addActivity(db, payload.projectId || null, 'Export created', `${payload.title}.${payload.format}`);
  return filePath;
}));

ipcMain.handle('ai:lessonPlan', ok(async ({ projectId }) => {
  const { project, files } = getProjectContext(projectId);
  return saveOutput(projectId, 'lesson-plan', 'Lesson Plan', await generateLessonPlan(project, files));
}));
ipcMain.handle('ai:quiz', ok(async ({ projectId, difficulty }) => {
  const { project, files } = getProjectContext(projectId);
  return saveOutput(projectId, 'quiz', `${difficulty || 'Intermediate'} Quiz`, await generateQuiz(project, files, { difficulty }));
}));
ipcMain.handle('ai:exercises', ok(async ({ projectId }) => {
  const { project, files } = getProjectContext(projectId);
  return saveOutput(projectId, 'exercises', 'Practical Exercises', await generateExercises(project, files));
}));
ipcMain.handle('ai:trainerNotes', ok(async ({ projectId }) => {
  const { project, files } = getProjectContext(projectId);
  return saveOutput(projectId, 'trainer-notes', 'Trainer Notes', await generateTrainerNotes(project, files));
}));
ipcMain.handle('ai:assignments', ok(async ({ projectId, type }) => {
  const { project, files } = getProjectContext(projectId);
  return saveOutput(projectId, 'content', type || 'Assignments', await createAssignments(project, files, type));
}));
ipcMain.handle('ai:summarize', ok(async ({ fileId }) => {
  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
  return summarizeDocument(file);
}));
ipcMain.handle('ai:chat', ok(async ({ projectId, question, allowGeneralKnowledge }) => {
  const db = getDb();
  const { project, files } = getProjectContext(projectId);
  const messages = db.prepare('SELECT * FROM chat_messages WHERE project_id = ? ORDER BY created_at ASC').all(projectId);
  const now = new Date().toISOString();
  db.prepare('INSERT INTO chat_messages VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), projectId, 'user', question, '[]', now);
  const response = await chatWithDocuments(project, files, messages, question, allowGeneralKnowledge);
  db.prepare('INSERT INTO chat_messages VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), projectId, 'assistant', response.answer, JSON.stringify(response.sources), new Date().toISOString());
  addActivity(db, projectId, 'Chat answered', question.slice(0, 80));
  rebuildSearchIndex(db, projectId);
  return response;
}));

ipcMain.handle('search:all', ok((query) => {
  if (!query?.trim()) return [];
  return getDb().prepare(`
    SELECT entity_type, entity_id, project_id, title, snippet(search_index, 4, '<mark>', '</mark>', '...', 12) AS snippet
    FROM search_index
    WHERE search_index MATCH ?
    LIMIT 50
  `).all(query.replace(/"/g, ''));
}));

ipcMain.handle('activity:recent', ok(() => getDb().prepare('SELECT * FROM activities ORDER BY created_at DESC LIMIT 12').all()));

function getProjectContext(projectId) {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) throw new Error('Project not found');
  const files = db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY uploaded_at DESC').all(projectId);
  return { project, files };
}

function saveOutput(projectId, type, title, content) {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO ai_outputs VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, projectId, type, title, content, now, now);
  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, projectId);
  addActivity(db, projectId, `${title} generated`, type);
  rebuildSearchIndex(db, projectId);
  return db.prepare('SELECT * FROM ai_outputs WHERE id = ?').get(id);
}
