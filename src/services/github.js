// ═══════════════════════════════════════════════════
// GitHub API Storage Adapter
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
    geminiApiKey: '',
    categories: ['Work', 'Personal', 'Learning', 'Health', 'Finance'],
    notificationsEnabled: true
  }
};

let lastSha = null;
let localDbCache = null;

export async function readFromGitHub() {
  if (!isGitHubConfigured()) {
    return localDbCache || structuredClone(defaultDb);
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
      // File doesn't exist yet, we will create it on first write
      localDbCache = structuredClone(defaultDb);
      return localDbCache;
    }

    if (!res.ok) throw new Error('Failed to read from GitHub');

    const data = await res.json();
    lastSha = data.sha;
    
    // Decode base64 content
    const content = decodeURIComponent(escape(atob(data.content)));
    localDbCache = JSON.parse(content);
    return localDbCache;
  } catch (err) {
    console.error('GitHub Read Error:', err);
    throw err;
  }
}

export async function writeToGitHub(db) {
  localDbCache = db; // Update cache immediately

  if (!isGitHubConfigured()) return;

  const { token, owner, repo, branch, path } = getGitHubConfig();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  // Encode content to base64
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
      // If conflict (409) or sha mismatch (422), we should ideally re-fetch and merge
      // But for a personal app, we'll just throw the error for now
      throw new Error(errData.message || 'Failed to write to GitHub');
    }

    const data = await res.json();
    lastSha = data.content.sha; // Update sha for next write
  } catch (err) {
    console.error('GitHub Write Error:', err);
    throw err;
  }
}
