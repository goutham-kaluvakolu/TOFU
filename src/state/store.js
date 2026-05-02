// ═══════════════════════════════════════════════════
// Central State Store (pub/sub pattern)
// ═══════════════════════════════════════════════════

const initialState = {
  tasks: [],
  completionLogs: [],
  settings: {
    geminiApiKey: '',
    categories: ['Work', 'Personal', 'Learning', 'Health', 'Finance'],
    notificationsEnabled: true
  },
  currentView: 'tasks',
  energyLevel: 'balanced',
  taskFilter: 'active',
  isLoading: false,
  aiProcessing: false
};

class Store {
  constructor() {
    this.state = { ...initialState };
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  setState(partial) {
    const prev = this.state;
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(fn => fn(this.state, prev));
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // Convenience getters
  get tasks() { return this.state.tasks; }
  get activeTasks() { return this.state.tasks.filter(t => !t.completed && !t.parentId).sort((a, b) => a.order - b.order); }
  get completedTasks() { return this.state.tasks.filter(t => t.completed && !t.parentId).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)); }
  get allTopLevel() { return this.state.tasks.filter(t => !t.parentId).sort((a, b) => a.order - b.order); }

  getSubtasks(parentId) {
    return this.state.tasks.filter(t => t.parentId === parentId).sort((a, b) => a.order - b.order);
  }

  getFilteredTasks() {
    const f = this.state.taskFilter;
    if (f === 'completed') return this.completedTasks;
    if (f === 'active') return this.activeTasks;
    return this.allTopLevel;
  }
}

export const store = new Store();
