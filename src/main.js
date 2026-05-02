// ═══════════════════════════════════════════════════
// FlowList — Main Entry Point
// ═══════════════════════════════════════════════════

import './styles/index.css';
import './styles/components.css';
import './styles/animations.css';

import { store } from './state/store.js';
import { api } from './services/api.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { renderTaskInput } from './components/taskInput.js';
import { renderEnergyBar } from './components/energyBar.js';
import { renderTaskList, renderList } from './components/taskList.js';
import { renderSummaryPanel } from './components/summaryPanel.js';
import { renderClockChart } from './components/clockChart.js';
import { renderSettings } from './components/settingsModal.js';
import { deadlineLabel } from './utils/time.js';

// ─── Initialize ──────────────────────────────────

async function init() {
  try {
    const [tasks, logs, settings] = await Promise.all([
      api.getTasks(),
      api.getLogs(),
      api.getSettings()
    ]);
    store.setState({ tasks, completionLogs: logs, settings, isLoading: false });
  } catch (err) {
    console.error('Failed to load data:', err);
    store.setState({ isLoading: false });
  }

  renderSidebar();
  renderHeader();
  renderView();

  // Subscribe to state changes
  store.subscribe((state, prev) => {
    if (state.currentView !== prev.currentView) {
      renderSidebar();
      renderView();
    }
    if (state.tasks !== prev.tasks || state.taskFilter !== prev.taskFilter) {
      if (state.currentView === 'tasks') renderList();
    }
    if (state.completionLogs !== prev.completionLogs) {
      renderHeader();
    }
  });

  // Start notification checker
  startNotificationChecker();
}

// ─── View Router ─────────────────────────────────

function renderView() {
  const container = document.getElementById('view-container');
  container.innerHTML = '';

  const view = store.getState().currentView;

  if (view === 'tasks') {
    renderTaskInput(container);
    renderEnergyBar(container);
    renderTaskList(container);
  } else if (view === 'analytics') {
    renderSummaryPanel(container);
  } else if (view === 'clock') {
    renderClockChart(container);
  } else if (view === 'settings') {
    renderSettings(container);
  }
}

// ─── Notification System ─────────────────────────

const notifiedTasks = new Set();

function startNotificationChecker() {
  // Request permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  setInterval(() => {
    if (!store.getState().settings.notificationsEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const tasks = store.getState().tasks.filter(t => !t.completed && t.deadline);
    const now = Date.now();

    tasks.forEach(task => {
      if (notifiedTasks.has(task.id)) return;
      const dl = new Date(task.deadline).getTime();
      const diff = dl - now;
      // Notify if deadline is within 15 minutes
      if (diff > 0 && diff <= 15 * 60 * 1000) {
        notifiedTasks.add(task.id);
        new Notification('⏰ FlowList Reminder', {
          body: `"${task.title}" is due in ${Math.ceil(diff / 60000)} minutes!`,
          icon: '⚡'
        });
      }
    });
  }, 60000); // Check every minute
}

// ─── Boot ────────────────────────────────────────

init();
