// Summary Panel — Daily / Weekly / Monthly / Yearly analytics
import { el } from '../utils/dom.js';
import { store } from '../state/store.js';
import { getTodayStats, getWeekStats, getMonthStats, getYearStats } from '../services/analytics.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

let currentTab = 'today';
let chartInstance = null;

export function renderSummaryPanel(container) {
  container.innerHTML = '';

  // Tabs
  const tabs = el('div', { className: 'summary-tabs' });
  ['today', 'week', 'month', 'year'].forEach(t => {
    tabs.appendChild(el('button', {
      className: `summary-tab ${currentTab === t ? 'active' : ''}`,
      onClick: () => { currentTab = t; renderSummaryPanel(container); }
    }, t.charAt(0).toUpperCase() + t.slice(1)));
  });
  container.appendChild(tabs);

  const logs = store.getState().completionLogs;
  let stats;
  if (currentTab === 'today') stats = getTodayStats(logs);
  else if (currentTab === 'week') stats = getWeekStats(logs);
  else if (currentTab === 'month') stats = getMonthStats(logs);
  else stats = getYearStats(logs);

  // Stat cards
  const statGrid = el('div', { className: 'summary-stats' });
  statGrid.appendChild(makeStatCard(stats.tasksCompleted, 'Tasks Done'));
  const hrs = Math.floor((stats.totalMinutes || 0) / 60);
  const mins = (stats.totalMinutes || 0) % 60;
  statGrid.appendChild(makeStatCard(hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`, 'Time Invested'));
  const catKeys = Object.keys(stats.byCategory || {});
  const topCat = catKeys.length > 0 ? catKeys.reduce((a, b) => stats.byCategory[a] > stats.byCategory[b] ? a : b) : '—';
  statGrid.appendChild(makeStatCard(topCat, 'Top Category'));
  container.appendChild(statGrid);

  // Chart
  const chartWrap = el('div', { className: 'summary-chart-wrap' });
  const chartTitle = currentTab === 'today' ? 'Tasks by Hour' :
    currentTab === 'week' ? 'Tasks by Day' :
    currentTab === 'month' ? 'Tasks by Day of Month' : 'Tasks by Month';
  chartWrap.appendChild(el('h3', {}, chartTitle));
  const canvas = el('canvas', { id: 'summary-chart' });
  chartWrap.appendChild(canvas);
  container.appendChild(chartWrap);

  // Render chart after DOM update
  requestAnimationFrame(() => renderChart(canvas, stats));

  // Category breakdown
  if (catKeys.length > 0) {
    const catWrap = el('div', { className: 'summary-chart-wrap' });
    catWrap.appendChild(el('h3', {}, 'By Category'));
    const catCanvas = el('canvas', { id: 'category-chart' });
    catWrap.appendChild(catCanvas);
    container.appendChild(catWrap);
    requestAnimationFrame(() => renderCategoryChart(catCanvas, stats.byCategory));
  }
}

function makeStatCard(value, label) {
  return el('div', { className: 'stat-card' },
    el('div', { className: 'stat-value' }, String(value)),
    el('div', { className: 'stat-label' }, label)
  );
}

function renderChart(canvas, stats) {
  if (chartInstance) chartInstance.destroy();
  let labels, data;

  if (currentTab === 'today') {
    labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    data = labels.map((_, i) => stats.byHour[i] || 0);
  } else if (currentTab === 'week') {
    labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    data = stats.dailyCounts;
  } else if (currentTab === 'month') {
    labels = stats.dailyCounts.map((_, i) => i + 1);
    data = stats.dailyCounts;
  } else {
    labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    data = stats.monthlyCounts;
  }

  chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Tasks Completed',
        data,
        backgroundColor: 'rgba(139,92,246,0.5)',
        borderColor: 'rgba(139,92,246,0.8)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#5c5c72' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { ticks: { color: '#5c5c72', maxRotation: 0 }, grid: { display: false } }
      }
    }
  });
}

function renderCategoryChart(canvas, byCategory) {
  const labels = Object.keys(byCategory);
  const data = Object.values(byCategory);
  const colors = ['#8b5cf6','#06b6d4','#f97316','#22c55e','#f43f5e','#eab308'];

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#9090a8', padding: 16 } }
      }
    }
  });
}
