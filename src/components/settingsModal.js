// Settings Modal
import { el, $ } from '../utils/dom.js';
import { store } from '../state/store.js';
import { api } from '../services/api.js';
import { getGitHubConfig, saveGitHubConfig } from '../services/github.js';

export function renderSettings(container) {
  container.innerHTML = '';

  const wrap = el('div', { style: 'max-width:520px;margin:0 auto;' });
  wrap.appendChild(el('h2', { style: 'font-size:var(--fs-xl);font-weight:700;margin-bottom:var(--sp-6);' }, '⚙️ Settings'));

  const settings = store.getState().settings;
  const ghConfig = getGitHubConfig();

  // GitHub Sync Config
  const ghGroup = el('div', { className: 'settings-group', style: 'padding:var(--sp-4); background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--r-md); margin-bottom:var(--sp-6);' });
  ghGroup.appendChild(el('h3', { style: 'margin-bottom:var(--sp-4); display:flex; align-items:center; gap:var(--sp-2);' }, '🐙 GitHub Sync (Database)'));
  
  ghGroup.appendChild(el('label', {}, 'Personal Access Token (classic with "repo" scope)'));
  const ghToken = el('input', { type: 'password', id: 'gh-token', value: ghConfig.token || '', placeholder: 'ghp_xxxxxxxxxxx', className: 'task-input-field', style: 'margin-bottom:var(--sp-3);' });
  ghGroup.appendChild(ghToken);

  const row1 = el('div', { style: 'display:flex; gap:var(--sp-3); margin-bottom:var(--sp-3);' });
  const ownerWrap = el('div', { style: 'flex:1;' });
  ownerWrap.appendChild(el('label', {}, 'Owner / Username'));
  const ghOwner = el('input', { type: 'text', id: 'gh-owner', value: ghConfig.owner || '', placeholder: 'octocat', className: 'task-input-field' });
  ownerWrap.appendChild(ghOwner);
  const repoWrap = el('div', { style: 'flex:1;' });
  repoWrap.appendChild(el('label', {}, 'Repository'));
  const ghRepo = el('input', { type: 'text', id: 'gh-repo', value: ghConfig.repo || '', placeholder: 'flowlist-data', className: 'task-input-field' });
  repoWrap.appendChild(ghRepo);
  row1.append(ownerWrap, repoWrap);
  ghGroup.appendChild(row1);

  const row2 = el('div', { style: 'display:flex; gap:var(--sp-3);' });
  const branchWrap = el('div', { style: 'flex:1;' });
  branchWrap.appendChild(el('label', {}, 'Branch'));
  const ghBranch = el('input', { type: 'text', id: 'gh-branch', value: ghConfig.branch || 'main', className: 'task-input-field' });
  branchWrap.appendChild(ghBranch);
  const pathWrap = el('div', { style: 'flex:1;' });
  pathWrap.appendChild(el('label', {}, 'File Path'));
  const ghPath = el('input', { type: 'text', id: 'gh-path', value: ghConfig.path || 'flowlist-data.json', className: 'task-input-field' });
  pathWrap.appendChild(ghPath);
  row2.append(branchWrap, pathWrap);
  ghGroup.appendChild(row2);
  
  ghGroup.appendChild(el('div', { className: 'hint', style: 'margin-top:var(--sp-3);' }, 'Data will be synced automatically to this GitHub repository. Sync across all your devices for free.'));
  wrap.appendChild(ghGroup);

  // API Key
  const apiGroup = el('div', { className: 'settings-group' });
  apiGroup.appendChild(el('label', {}, 'Gemini API Key'));
  const apiInput = el('input', {
    type: 'password',
    id: 'settings-api-key',
    value: settings.geminiApiKey || '',
    placeholder: 'Paste your Gemini API key here',
    className: 'task-input-field'
  });
  apiGroup.appendChild(apiInput);
  apiGroup.appendChild(el('div', { className: 'hint' }, 'Get a free key at ai.google.dev. Required for AI features.'));
  wrap.appendChild(apiGroup);

  // Notifications
  const notifGroup = el('div', { className: 'settings-group' });
  notifGroup.appendChild(el('label', {}, 'Notifications'));
  const notifToggle = el('label', { style: 'display:flex;align-items:center;gap:var(--sp-3);cursor:pointer;font-size:var(--fs-sm);color:var(--text-secondary);' });
  const notifCb = el('input', { type: 'checkbox', id: 'settings-notif' });
  if (settings.notificationsEnabled) notifCb.checked = true;
  notifToggle.append(notifCb, document.createTextNode(' Enable deadline notifications'));
  notifGroup.appendChild(notifToggle);
  wrap.appendChild(notifGroup);

  // Categories
  const catGroup = el('div', { className: 'settings-group' });
  catGroup.appendChild(el('label', {}, 'Categories (comma-separated)'));
  const catInput = el('input', {
    type: 'text',
    id: 'settings-categories',
    value: (settings.categories || []).join(', '),
    className: 'task-input-field'
  });
  catGroup.appendChild(catInput);
  wrap.appendChild(catGroup);

  // Save button
  const saveBtn = el('button', { className: 'btn-primary', style: 'margin-top:var(--sp-4);' }, '💾 Save Settings');
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    const newGhConfig = {
      token: ghToken.value.trim(),
      owner: ghOwner.value.trim(),
      repo: ghRepo.value.trim(),
      branch: ghBranch.value.trim() || 'main',
      path: ghPath.value.trim() || 'flowlist-data.json'
    };
    
    const ghChanged = JSON.stringify(newGhConfig) !== JSON.stringify(ghConfig);
    if (ghChanged) {
      saveGitHubConfig(newGhConfig);
    }
    
    const newSettings = {
      geminiApiKey: apiInput.value.trim(),
      notificationsEnabled: notifCb.checked,
      categories: catInput.value.split(',').map(s => s.trim()).filter(Boolean)
    };
    
    await api.updateSettings(newSettings);
    store.setState({ settings: { ...store.getState().settings, ...newSettings } });
    
    saveBtn.disabled = false;
    saveBtn.textContent = '✓ Saved!';
    
    if (ghChanged) {
      alert('GitHub config updated. The page will reload to sync data.');
      window.location.reload();
    } else {
      setTimeout(() => saveBtn.textContent = '💾 Save Settings', 2000);
    }
  });
  wrap.appendChild(saveBtn);

  // Danger zone
  const danger = el('div', {
    style: 'margin-top:var(--sp-12);padding:var(--sp-5);border:1px solid var(--error-dim);border-radius:var(--r-lg);'
  });
  danger.appendChild(el('h3', { style: 'font-size:var(--fs-base);color:var(--error);margin-bottom:var(--sp-3);' }, '⚠️ Danger Zone'));
  const clearBtn = el('button', {
    className: 'btn-ghost',
    style: 'color:var(--error);',
    onClick: async () => {
      if (confirm('Delete ALL tasks and completion logs? This cannot be undone.')) {
        // Clear all tasks
        const tasks = store.getState().tasks;
        for (const t of tasks) await api.deleteTask(t.id);
        store.setState({ tasks: [], completionLogs: [] });
        clearBtn.textContent = '✓ Cleared';
      }
    }
  }, '🗑 Clear All Data');
  danger.appendChild(clearBtn);
  wrap.appendChild(danger);

  container.appendChild(wrap);
}
