// ═══════════════════════════════════════════════════
// API Client — now talks to GitHub Storage instead of Express
// ═══════════════════════════════════════════════════

import { readFromGitHub, writeToGitHub } from './github.js';

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Debounced background save
let saveTimeout = null;
function scheduleSave(db) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      await writeToGitHub(db);
    } catch (err) {
      console.error('Failed background save to GitHub', err);
    }
  }, 1000); // 1s debounce
}

export const api = {
  getTasks: async () => {
    const db = await readFromGitHub();
    return db.tasks || [];
  },

  createTasks: async (tasksArray) => {
    const db = await readFromGitHub();
    const items = Array.isArray(tasksArray) ? tasksArray : [tasksArray];
    const maxOrder = db.tasks.reduce((m, t) => Math.max(m, t.order ?? 0), -1);
    
    const created = items.map((t, i) => ({
      id: generateId(),
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
    scheduleSave(db);
    return created;
  },

  updateTask: async (id, data) => {
    const db = await readFromGitHub();
    const idx = db.tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    db.tasks[idx] = { ...db.tasks[idx], ...data, id: db.tasks[idx].id };
    scheduleSave(db);
    return db.tasks[idx];
  },

  deleteTask: async (id) => {
    const db = await readFromGitHub();
    const idsToDelete = new Set([id]);
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
    scheduleSave(db);
    return { deleted: [...idsToDelete] };
  },

  reorderTasks: async (orderedIds) => {
    const db = await readFromGitHub();
    orderedIds.forEach((id, index) => {
      const task = db.tasks.find(t => t.id === id);
      if (task) task.order = index;
    });
    scheduleSave(db);
    return db.tasks;
  },

  getLogs: async () => {
    const db = await readFromGitHub();
    return db.completionLogs || [];
  },

  createLog: async (logData) => {
    const db = await readFromGitHub();
    const ts = logData.completedAt || new Date().toISOString();
    const log = {
      id: generateId(),
      taskId: logData.taskId,
      taskTitle: logData.taskTitle || '',
      completedAt: ts,
      difficulty: logData.difficulty || 'medium',
      category: logData.category || 'Personal',
      estimatedMinutes: logData.estimatedMinutes || null,
      hourOfDay: new Date(ts).getHours()
    };
    db.completionLogs = db.completionLogs || [];
    db.completionLogs.push(log);
    scheduleSave(db);
    return log;
  },

  getSettings: async () => {
    const db = await readFromGitHub();
    return db.settings || {};
  },

  updateSettings: async (data) => {
    const db = await readFromGitHub();
    db.settings = { ...db.settings, ...data };
    scheduleSave(db);
    return db.settings;
  }
};
