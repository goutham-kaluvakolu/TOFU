// Task Input Component — with AI breakdown
import { el, $ } from '../utils/dom.js';
import { store } from '../state/store.js';
import { api } from '../services/api.js';
import { breakdownTask, hasApiKey, generateMoreSubtasks } from '../services/ai.js';

export function renderTaskInput(container) {
  const wrap = el('div', { className: 'task-input-wrap' });

  const row = el('div', { className: 'task-input-row' });
  const input = el('input', {
    className: 'task-input-field',
    type: 'text',
    id: 'task-input',
    placeholder: 'What do you need to do? (e.g., "Learn React" or "Meeting at 2pm")',
    autocomplete: 'off'
  });
  const addBtn = el('button', { className: 'btn-primary', id: 'add-task-btn' }, '✨ Add');
  row.append(input, addBtn);
  wrap.appendChild(row);

  // Category selector row
  const metaRow = el('div', { className: 'task-meta-row' });
  const catSelect = el('select', { id: 'task-category' });
  const cats = store.getState().settings.categories || ['Personal'];
  cats.forEach(c => {
    catSelect.appendChild(el('option', { value: c }, c));
  });
  metaRow.appendChild(catSelect);
  wrap.appendChild(metaRow);

  // Preview area (hidden initially)
  const previewArea = el('div', { id: 'ai-preview-area' });
  wrap.appendChild(previewArea);

  container.appendChild(wrap);

  // ─── Event Handlers ─────────────────────────────
  async function handleAdd() {
    const text = input.value.trim();
    if (!text) return;

    const category = catSelect.value;

    if (hasApiKey()) {
      // Try AI breakdown
      store.setState({ aiProcessing: true });
      showLoading(previewArea);

      try {
        const result = await breakdownTask(text);
        store.setState({ aiProcessing: false });

        if (result.isComplex && result.subtasks?.length > 0) {
          showPreview(previewArea, result, category, input);
        } else {
          // Simple task, add directly
          await addSimpleTask(result.mainTask || { title: text }, category);
          input.value = '';
          previewArea.innerHTML = '';
        }
      } catch (err) {
        store.setState({ aiProcessing: false });
        previewArea.innerHTML = '';
        if (err.message === 'NO_API_KEY') {
          showError(previewArea, 'Please configure your Gemini API Key in Settings.');
        } else {
          showError(previewArea, err.message);
        }
      }
    } else {
      showError(previewArea, 'Please configure your Gemini API Key in Settings to add tasks.');
    }
  }

  addBtn.addEventListener('click', handleAdd);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAdd();
  });
}

async function addSimpleTask(taskData, category) {
  const tasks = await api.createTasks({
    title: taskData.title,
    category: category,
    deadline: taskData.deadline || null,
    estimatedMinutes: taskData.estimatedMinutes || null,
    difficulty: 'medium'
  });
  const s = store.getState();
  store.setState({ tasks: [...s.tasks, ...tasks] });
}

function showLoading(container) {
  container.innerHTML = `
    <div class="ai-loading">
      <span>✨ AI is analyzing your task</span>
      <span class="dots"><span>.</span><span>.</span><span>.</span></span>
    </div>`;
}

function showError(container, msg) {
  container.innerHTML = `<div style="color:var(--error);font-size:var(--fs-sm);padding:var(--sp-3);">⚠️ ${msg}</div>`;
  setTimeout(() => container.innerHTML = '', 4000);
}

function showPreview(container, result, category, input) {
  container.innerHTML = '';
  const preview = el('div', { className: 'ai-preview anim-fade-in' });

  const header = el('div', { className: 'ai-preview-header' });
  header.appendChild(el('h3', {}, `✨ AI Breakdown: "${result.mainTask?.title || ''}"`));

  const actions = el('div', { className: 'ai-preview-actions' });
  const acceptBtn = el('button', { className: 'btn-primary' }, '✓ Accept All');
  const singleBtn = el('button', { className: 'btn-ghost' }, 'Add as Single');
  const cancelBtn = el('button', { className: 'btn-ghost' }, '✕ Cancel');
  actions.append(acceptBtn, singleBtn, cancelBtn);
  header.appendChild(actions);
  preview.appendChild(header);

  // Editable subtasks state
  let currentSubtasks = [...(result.subtasks || [])];

  const listContainer = el('div', { className: 'ai-subtask-list' });
  preview.appendChild(listContainer);

  const renderSubtasks = () => {
    listContainer.innerHTML = '';
    currentSubtasks.forEach((st, i) => {
      const row = el('div', { className: 'ai-subtask', style: 'gap:var(--sp-2); align-items:center;' });
      
      const num = el('span', { className: 'order-num', style: 'flex-shrink:0;' }, String(i + 1));
      
      const titleInput = el('input', {
        type: 'text',
        value: st.title,
        className: 'task-input-field',
        style: 'flex:1; padding:var(--sp-2); font-size:var(--fs-sm);',
        onInput: (e) => st.title = e.target.value
      });

      const estInput = el('input', {
        type: 'number',
        value: st.estimatedMinutes || '',
        placeholder: 'min',
        className: 'task-input-field',
        style: 'width:60px; padding:var(--sp-2); font-size:var(--fs-sm);',
        onInput: (e) => st.estimatedMinutes = parseInt(e.target.value) || null
      });

      const removeBtn = el('button', {
        className: 'task-action-btn delete',
        title: 'Remove subtask',
        style: 'flex-shrink:0;',
        onClick: () => {
          currentSubtasks.splice(i, 1);
          renderSubtasks();
        }
      }, '✕');

      row.append(num, titleInput, estInput, removeBtn);
      listContainer.appendChild(row);
    });

    const addRow = el('div', { className: 'ai-subtask', style: 'justify-content:center; margin-top:var(--sp-2); gap:var(--sp-4);' });
    const addBtn = el('button', {
      className: 'btn-ghost',
      onClick: () => {
        currentSubtasks.push({ title: 'New subtask', estimatedMinutes: null });
        renderSubtasks();
      }
    }, '+ Add subtask');
    
    const addAiBtn = el('button', {
      className: 'btn-ghost',
      style: 'color:var(--accent-light);',
      onClick: async () => {
        addAiBtn.innerHTML = '✨ Generating...';
        addAiBtn.disabled = true;
        try {
          const res = await generateMoreSubtasks(result.mainTask?.title || input.value.trim(), currentSubtasks);
          if (res && res.newSubtasks) {
            currentSubtasks.push(...res.newSubtasks);
          }
        } catch (err) {
          console.error('Failed to generate more subtasks', err);
        }
        renderSubtasks();
      }
    }, '✨ Add more tasks with AI');
    
    addRow.append(addBtn, addAiBtn);
    listContainer.appendChild(addRow);
  };

  renderSubtasks();

  container.appendChild(preview);

  // Accept all — create parent + subtasks
  acceptBtn.addEventListener('click', async () => {
    // filter empty titles
    const validSubtasks = currentSubtasks.filter(st => st.title.trim());
    
    const parentRes = await api.createTasks({
      title: result.mainTask?.title || input.value.trim(),
      category: result.mainTask?.category || category,
      deadline: result.mainTask?.deadline || null,
      estimatedMinutes: result.mainTask?.estimatedMinutes || null,
    });
    const parentId = parentRes[0].id;
    const subtaskData = validSubtasks.map((st, i) => ({
      title: st.title.trim(),
      parentId,
      category: result.mainTask?.category || category,
      estimatedMinutes: st.estimatedMinutes || null,
      order: i
    }));
    let subs = [];
    if (subtaskData.length > 0) {
      subs = await api.createTasks(subtaskData);
    }
    const s = store.getState();
    store.setState({ tasks: [...s.tasks, ...parentRes, ...subs] });
    input.value = '';
    container.innerHTML = '';
  });

  singleBtn.addEventListener('click', async () => {
    await addSimpleTask(result.mainTask || { title: input.value.trim() }, category);
    input.value = '';
    container.innerHTML = '';
  });

  cancelBtn.addEventListener('click', () => {
    container.innerHTML = '';
  });
}
