// ═══════════════════════════════════════════════════
// Analytics Engine
// ═══════════════════════════════════════════════════

import { isSameDay, getStartOfDay, getStartOfWeek } from '../utils/time.js';

export function getTodayStats(logs) {
  const today = getStartOfDay();
  const todayLogs = logs.filter(l => new Date(l.completedAt) >= today);
  return {
    tasksCompleted: todayLogs.length,
    totalMinutes: todayLogs.reduce((s, l) => s + (l.estimatedMinutes || 0), 0),
    byCategory: groupBy(todayLogs, 'category'),
    byDifficulty: groupBy(todayLogs, 'difficulty'),
    byHour: groupByHour(todayLogs)
  };
}

export function getWeekStats(logs) {
  const weekStart = getStartOfWeek();
  const weekLogs = logs.filter(l => new Date(l.completedAt) >= weekStart);
  const dailyCounts = [0, 0, 0, 0, 0, 0, 0];
  weekLogs.forEach(l => {
    const day = new Date(l.completedAt).getDay();
    dailyCounts[day]++;
  });
  return {
    tasksCompleted: weekLogs.length,
    totalMinutes: weekLogs.reduce((s, l) => s + (l.estimatedMinutes || 0), 0),
    dailyCounts,
    byCategory: groupBy(weekLogs, 'category'),
    byHour: groupByHour(weekLogs)
  };
}

export function getMonthStats(logs, month, year) {
  const now = new Date();
  const m = month ?? now.getMonth();
  const y = year ?? now.getFullYear();
  const monthLogs = logs.filter(l => {
    const d = new Date(l.completedAt);
    return d.getMonth() === m && d.getFullYear() === y;
  });
  // Build day-by-day heatmap
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const dailyCounts = Array(daysInMonth).fill(0);
  monthLogs.forEach(l => {
    const day = new Date(l.completedAt).getDate() - 1;
    dailyCounts[day]++;
  });
  return {
    tasksCompleted: monthLogs.length,
    totalMinutes: monthLogs.reduce((s, l) => s + (l.estimatedMinutes || 0), 0),
    dailyCounts,
    byCategory: groupBy(monthLogs, 'category'),
    byHour: groupByHour(monthLogs)
  };
}

export function getYearStats(logs, year) {
  const y = year ?? new Date().getFullYear();
  const yearLogs = logs.filter(l => new Date(l.completedAt).getFullYear() === y);
  const monthlyCounts = Array(12).fill(0);
  yearLogs.forEach(l => {
    monthlyCounts[new Date(l.completedAt).getMonth()]++;
  });
  return {
    tasksCompleted: yearLogs.length,
    totalMinutes: yearLogs.reduce((s, l) => s + (l.estimatedMinutes || 0), 0),
    monthlyCounts,
    byCategory: groupBy(yearLogs, 'category'),
    byHour: groupByHour(yearLogs)
  };
}

export function getPeakHours(logs) {
  const hourCounts = groupByHour(logs);
  let maxCount = 0;
  let peakHour = 0;
  for (let h = 0; h < 24; h++) {
    if ((hourCounts[h] || 0) > maxCount) {
      maxCount = hourCounts[h];
      peakHour = h;
    }
  }
  // Find window (contiguous peak)
  const sorted = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
  const topHours = sorted.slice(0, 3).map(([h]) => parseInt(h)).sort((a, b) => a - b);
  return { peakHour, topHours, hourCounts, maxCount };
}

export function getStreak(logs) {
  if (!logs.length) return 0;
  const days = new Set();
  logs.forEach(l => {
    const d = new Date(l.completedAt);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (days.has(key)) streak++;
    else if (i > 0) break; // Allow today to not count yet
  }
  return streak;
}

// ─── Helpers ─────────────────────────────────────

function groupBy(arr, key) {
  const map = {};
  arr.forEach(item => {
    const k = item[key] || 'Other';
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

function groupByHour(arr) {
  const map = {};
  arr.forEach(item => {
    const h = item.hourOfDay ?? new Date(item.completedAt).getHours();
    map[h] = (map[h] || 0) + 1;
  });
  return map;
}
