// Header Component
import { el, $ } from '../utils/dom.js';
import { store } from '../state/store.js';
import { getGreeting, formatTime } from '../utils/time.js';
import { getStreak, getTodayStats } from '../services/analytics.js';

let clockInterval;

export function renderHeader() {
  const header = $('#header');
  header.innerHTML = '';

  const greeting = el('div', { className: 'header-greeting' },
    el('h2', {}, getGreeting() + ' 👋'),
    el('p', {}, "Let's make today count")
  );

  const logs = store.getState().completionLogs;
  const todayStats = getTodayStats(logs);
  const streak = getStreak(logs);

  const stats = el('div', { className: 'header-stats' },
    el('div', { className: 'header-stat' },
      el('div', { className: 'val' }, String(todayStats.tasksCompleted)),
      el('div', { className: 'lbl' }, 'Done Today')
    ),
    el('div', { className: 'header-stat' },
      el('div', { className: 'val' }, `${streak}🔥`),
      el('div', { className: 'lbl' }, 'Streak')
    )
  );

  const clock = el('div', { className: 'header-clock', id: 'live-clock' },
    formatTime(new Date())
  );

  header.append(greeting, stats, clock);

  // Update clock every second
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(() => {
    const c = $('#live-clock');
    if (c) c.textContent = formatTime(new Date());
  }, 1000);
}
