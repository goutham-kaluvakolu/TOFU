// Task Card Component
import { el } from '../utils/dom.js';
import { store } from '../state/store.js';
import { api } from '../services/api.js';
import { deadlineLabel, timeAgo } from '../utils/time.js';

const expandedTasks = new Set();

export function createTaskCard(task) {
  const isCompleted = task.completed;
  const subtasks = store.getSubtasks(task.id);
  const hasSubtasks = subtasks.length > 0;

  const card = el('div', {
    className: `task-card anim-fade-in ${isCompleted ? 'completed' : ''}`,
    dataset: { id: task.id }
  });

  // Checkbox
  const checkbox = el('div', {
    className: 'task-checkbox',
    onClick: () => toggleComplete(task)
  });
  card.appendChild(checkbox);

  // Body
  const body = el('div', { className: 'task-body' });
  body.appendChild(el('div', { className: 'task-title' }, task.title));

  // Meta row
  const meta = el('div', { className: 'task-meta' });
  if (task.category) meta.appendChild(el('span', { className: 'badge' }, task.category));
  if (task.estimatedMinutes) meta.appendChild(el('span', {}, `⏱ ${task.estimatedMinutes}m`));

  const dl = deadlineLabel(task.deadline);
  if (dl) {
    const dlSpan = el('span', {}, `⏰ ${dl.text}`);
    if (dl.urgent) dlSpan.style.color = 'var(--warning)';
    meta.appendChild(dlSpan);
  }

  if (isCompleted && task.completedAt) {
    meta.appendChild(el('span', {}, `✓ ${timeAgo(task.completedAt)}`));
  }

  if (hasSubtasks) {
    const done = subtasks.filter(s => s.completed).length;
    meta.appendChild(el('span', {}, `📎 ${done}/${subtasks.length}`));
  }

  body.appendChild(meta);

  // Subtask toggle + list
  if (hasSubtasks && !isCompleted) {
    const isExpanded = expandedTasks.has(task.id);
    const toggle = el('div', {
      className: 'subtask-toggle',
      innerHTML: isExpanded ? '▾ Hide subtasks' : '▸ Show subtasks'
    });
    const subList = el('div', { className: 'task-subtasks', style: isExpanded ? 'display:flex;' : 'display:none;' });
    subtasks.forEach(st => {
      subList.appendChild(createSubtaskRow(st));
    });
    toggle.addEventListener('click', () => {
      const visible = subList.style.display !== 'none';
      if (visible) {
        subList.style.display = 'none';
        toggle.innerHTML = '▸ Show subtasks';
        expandedTasks.delete(task.id);
      } else {
        subList.style.display = 'flex';
        toggle.innerHTML = '▾ Hide subtasks';
        expandedTasks.add(task.id);
      }
    });
    body.append(toggle, subList);
  }

  card.appendChild(body);

  // Actions
  if (!isCompleted) {
    const actions = el('div', { className: 'task-actions' });
    const deleteBtn = el('button', {
      className: 'task-action-btn delete',
      title: 'Delete',
      onClick: () => deleteTask(task.id)
    }, '🗑');
    actions.appendChild(deleteBtn);
    card.appendChild(actions);
  }

  return card;
}

function createSubtaskRow(task) {
  const row = el('div', {
    className: `task-card ${task.completed ? 'completed' : ''}`,
    style: 'padding:var(--sp-3) var(--sp-4);',
    dataset: { id: task.id }
  });
  const cb = el('div', {
    className: 'task-checkbox',
    onClick: () => toggleComplete(task)
  });
  row.appendChild(cb);
  const body = el('div', { className: 'task-body' });
  body.appendChild(el('div', { className: 'task-title', style: 'font-size:var(--fs-sm);' }, task.title));
  if (task.estimatedMinutes) {
    body.appendChild(el('div', { className: 'task-meta' }, el('span', {}, `⏱ ${task.estimatedMinutes}m`)));
  }
  row.appendChild(body);
  return row;
}

async function toggleComplete(task) {
  const now = new Date().toISOString();
  const newCompleted = !task.completed;

  await api.updateTask(task.id, {
    completed: newCompleted,
    completedAt: newCompleted ? now : null
  });

  // Log completion
  if (newCompleted) {
    await api.createLog({
      taskId: task.id,
      taskTitle: task.title,
      completedAt: now,
      difficulty: task.difficulty,
      category: task.category,
      estimatedMinutes: task.estimatedMinutes
    });
    const logs = await api.getLogs();
    store.setState({ completionLogs: logs });
  }

  // Refresh tasks
  const tasks = await api.getTasks();
  store.setState({ tasks });
}

async function deleteTask(id) {
  await api.deleteTask(id);
  const tasks = await api.getTasks();
  store.setState({ tasks });
}
