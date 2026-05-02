// Energy Bar Component — energy level selector + custom reorder
import { el } from '../utils/dom.js';
import { store } from '../state/store.js';
import { api } from '../services/api.js';
import { reorderTasks, hasApiKey } from '../services/ai.js';

const ENERGY_LEVELS = [
  { id: 'peak', emoji: '🔥', label: 'Peak Focus', desc: 'Deep work, hardest first' },
  { id: 'high', emoji: '⚡', label: 'High Energy', desc: 'Challenging tasks welcome' },
  { id: 'balanced', emoji: '😊', label: 'Balanced', desc: 'Default mixed order' },
  { id: 'moderate', emoji: '☕', label: 'Need a Boost', desc: 'Nothing too heavy' },
  { id: 'low', emoji: '😮‍💨', label: 'Low Battery', desc: 'Easy wins first' },
  { id: 'winding', emoji: '🌙', label: 'Winding Down', desc: 'Lightest tasks only' },
];

export function renderEnergyBar(container) {
  const bar = el('div', { className: 'energy-bar' });

  const levels = el('div', { className: 'energy-levels' });
  ENERGY_LEVELS.forEach(lev => {
    const pill = el('button', {
      className: `energy-pill ${store.getState().energyLevel === lev.id ? 'active' : ''}`,
      dataset: { energy: lev.id },
      title: lev.desc,
      onClick: () => selectEnergy(lev.id)
    }, `${lev.emoji} ${lev.label}`);
    levels.appendChild(pill);
  });
  bar.appendChild(levels);

  // Custom reorder input
  const customRow = el('div', { className: 'energy-custom-row' });
  const customInput = el('input', {
    className: 'energy-custom-input',
    id: 'custom-reorder-input',
    type: 'text',
    placeholder: 'Custom reorder: "I have a meeting at 3pm, prep first" or "focus on coding today"'
  });
  const reorderBtn = el('button', { className: 'btn-primary', id: 'reorder-btn' }, '🔄 Reorder');
  customRow.append(customInput, reorderBtn);
  bar.appendChild(customRow);

  // Reasoning display
  const reasonArea = el('div', { id: 'reorder-reasoning', style: 'font-size:var(--fs-xs);color:var(--text-muted);margin-top:var(--sp-2);min-height:20px;' });
  bar.appendChild(reasonArea);

  container.appendChild(bar);

  reorderBtn.addEventListener('click', () => doReorder());
  customInput.addEventListener('keydown', e => { if (e.key === 'Enter') doReorder(); });
}

function selectEnergy(id) {
  store.setState({ energyLevel: id });
  // Update active pill
  document.querySelectorAll('.energy-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.energy === id);
  });
}

async function doReorder() {
  if (!hasApiKey()) {
    const r = document.getElementById('reorder-reasoning');
    if (r) r.textContent = '⚠️ Add your Gemini API key in Settings to enable AI reordering.';
    return;
  }

  const activeTasks = store.activeTasks;
  if (activeTasks.length <= 1) return;

  const customInput = document.getElementById('custom-reorder-input');
  const customPrompt = customInput?.value.trim() || '';
  const energyLevel = store.getState().energyLevel;

  store.setState({ aiProcessing: true });
  const reason = document.getElementById('reorder-reasoning');
  if (reason) reason.innerHTML = '<span class="ai-loading">Reordering<span class="dots"><span>.</span><span>.</span><span>.</span></span></span>';

  try {
    const result = await reorderTasks(activeTasks, energyLevel, customPrompt);
    if (result.orderedIds?.length) {
      await api.reorderTasks(result.orderedIds);
      // Refresh tasks from server
      const tasks = await api.getTasks();
      store.setState({ tasks, aiProcessing: false });
      if (reason) reason.textContent = `✨ ${result.reasoning || 'Reordered successfully.'}`;
    }
  } catch (err) {
    store.setState({ aiProcessing: false });
    if (reason) reason.textContent = `⚠️ ${err.message}`;
  }
}
