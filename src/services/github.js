// ═══════════════════════════════════════════════════
// GitHub API Storage Adapter (with LocalStorage fallback)
// ═══════════════════════════════════════════════════

export function getGitHubConfig() {
  const cfg = localStorage.getItem('flowlist_gh_config');
  return cfg ? JSON.parse(cfg) : {
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
    path: 'flowlist-data.json'
  };
}

export function saveGitHubConfig(cfg) {
  localStorage.setItem('flowlist_gh_config', JSON.stringify(cfg));
}

export function isGitHubConfigured() {
  const cfg = getGitHubConfig();
  return cfg.token && cfg.owner && cfg.repo;
}

const defaultDb = {
  tasks: [],
  completionLogs: [],
  settings: {
    categories: ['Work', 'Personal', 'Learning', 'Health', 'Finance'],
    notificationsEnabled: true
  }
};

let lastSha = null;
let localDbCache = null;

function getLocalDb() {
  const saved = localStorage.getItem('flowlist_local_db');
  return saved ? JSON.parse(saved) : structuredClone(defaultDb);
}

function saveLocalDb(db) {
  localStorage.setItem('flowlist_local_db', JSON.stringify(db));
  localDbCache = db;
}

export async function readFromGitHub() {
  if (!isGitHubConfigured()) {
    localDbCache = getLocalDb();
    return localDbCache;
  }

  const { token, owner, repo, branch, path } = getGitHubConfig();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });

    if (res.status === 404) {
      localDbCache = getLocalDb();
      return localDbCache;
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('Failed to read from GitHub, falling back to local.', errData);
      localDbCache = getLocalDb();
      return localDbCache;
    }

    const data = await res.json();
    lastSha = data.sha;
    
    // Decode base64 content
    const content = decodeURIComponent(escape(atob(data.content)));
    localDbCache = JSON.parse(content);
    
    // Sync to local fallback
    localStorage.setItem('flowlist_local_db', JSON.stringify(localDbCache));
    return localDbCache;
  } catch (err) {
    console.warn('GitHub Read Error, using local cache:', err);
    localDbCache = getLocalDb();
    return localDbCache;
  }
}

export async function writeToGitHub(db) {
  saveLocalDb(db); // Always save locally first!

  if (!isGitHubConfigured()) return;

  const { token, owner, repo, branch, path } = getGitHubConfig();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(db, null, 2))));

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'FlowList: Update data',
        content,
        branch,
        sha: lastSha || undefined
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to write to GitHub');
    }

    const data = await res.json();
    lastSha = data.content.sha;
  } catch (err) {
    console.error('GitHub Write Error:', err);
    throw err; // Re-throw so caller knows it failed
  }
}
