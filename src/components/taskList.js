// Task List Component
import { el, $ } from '../utils/dom.js';
import { store } from '../state/store.js';
import { createTaskCard } from './taskCard.js';

export function renderTaskList(container) {
  // Filters
  const filters = el('div', { className: 'task-filters' });
  ['active', 'all', 'completed'].forEach(f => {
    const tab = el('button', {
      className: `filter-tab ${store.getState().taskFilter === f ? 'active' : ''}`,
      onClick: () => {
        store.setState({ taskFilter: f });
      }
    }, f.charAt(0).toUpperCase() + f.slice(1));
    filters.appendChild(tab);
  });
  container.appendChild(filters);

  // Task list container
  const list = el('div', { className: 'task-list', id: 'task-list' });
  container.appendChild(list);

  renderList(list);
}

export function renderList(listEl) {
  if (!listEl) listEl = document.getElementById('task-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const tasks = store.getFilteredTasks();

  if (tasks.length === 0) {
    const empty = el('div', { className: 'task-list-empty anim-fade-in' },
      el('div', { className: 'empty-icon' }, '📝'),
      el('p', {}, store.getState().taskFilter === 'completed'
        ? 'No completed tasks yet. Start checking things off!'
        : 'No tasks yet. Add something above to get started!')
    );
    listEl.appendChild(empty);
    return;
  }

  tasks.forEach(task => {
    listEl.appendChild(createTaskCard(task));
  });
}
