import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;
const DB_PATH = join(__dirname, 'data', 'db.json');

// Ensure data directory
const dataDir = join(__dirname, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const defaultDb = {
  tasks: [],
  completionLogs: [],
  settings: {
    geminiApiKey: '',
    categories: ['Work', 'Personal', 'Learning', 'Health', 'Finance'],
    notificationsEnabled: true
  }
};

function readDb() {
  if (!existsSync(DB_PATH)) {
    writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2));
    return structuredClone(defaultDb);
  }
  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return structuredClone(defaultDb);
  }
}

function writeDb(db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

app.use(express.json({ limit: '5mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── Tasks ────────────────────────────────────────────

app.get('/api/tasks', (req, res) => {
  const db = readDb();
  res.json(db.tasks);
});

app.post('/api/tasks', (req, res) => {
  const db = readDb();
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const maxOrder = db.tasks.reduce((m, t) => Math.max(m, t.order ?? 0), -1);
  const created = items.map((t, i) => ({
    id: randomUUID(),
    title: t.title || '',
    description: t.description || '',
    difficulty: t.difficulty || 'medium',
    estimatedMinutes: t.estimatedMinutes || null,
    deadline: t.deadline || null,
    parentId: t.parentId || null,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    order: maxOrder + 1 + i,
    tags: t.tags || [],
    category: t.category || 'Personal'
  }));
  db.tasks.push(...created);
  writeDb(db);
  res.status(201).json(created);
});

// Reorder — must be defined BEFORE :id route
app.post('/api/tasks/reorder', (req, res) => {
  const db = readDb();
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds required' });
  orderedIds.forEach((id, index) => {
    const task = db.tasks.find(t => t.id === id);
    if (task) task.order = index;
  });
  writeDb(db);
  res.json(db.tasks);
});

app.put('/api/tasks/:id', (req, res) => {
  const db = readDb();
  const idx = db.tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  db.tasks[idx] = { ...db.tasks[idx], ...req.body, id: db.tasks[idx].id };
  writeDb(db);
  res.json(db.tasks[idx]);
});

app.delete('/api/tasks/:id', (req, res) => {
  const db = readDb();
  const idsToDelete = new Set([req.params.id]);
  let found = true;
  while (found) {
    found = false;
    for (const t of db.tasks) {
      if (t.parentId && idsToDelete.has(t.parentId) && !idsToDelete.has(t.id)) {
        idsToDelete.add(t.id);
        found = true;
      }
    }
  }
  db.tasks = db.tasks.filter(t => !idsToDelete.has(t.id));
  writeDb(db);
  res.json({ deleted: [...idsToDelete] });
});

// ─── Completion Logs ──────────────────────────────────

app.get('/api/logs', (req, res) => {
  const db = readDb();
  res.json(db.completionLogs);
});

app.post('/api/logs', (req, res) => {
  const db = readDb();
  const ts = req.body.completedAt || new Date().toISOString();
  const log = {
    id: randomUUID(),
    taskId: req.body.taskId,
    taskTitle: req.body.taskTitle || '',
    completedAt: ts,
    difficulty: req.body.difficulty || 'medium',
    category: req.body.category || 'Personal',
    estimatedMinutes: req.body.estimatedMinutes || null,
    hourOfDay: new Date(ts).getHours()
  };
  db.completionLogs.push(log);
  writeDb(db);
  res.status(201).json(log);
});

// ─── Settings ─────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  const db = readDb();
  res.json(db.settings);
});

app.put('/api/settings', (req, res) => {
  const db = readDb();
  db.settings = { ...db.settings, ...req.body };
  writeDb(db);
  res.json(db.settings);
});

// ─── Production static serving ────────────────────────

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
  app.get('*', (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));
}

app.listen(PORT, () => {
  console.log(`✅ FlowList API running → http://localhost:${PORT}`);
});
