// Internal Clock Chart — shows most productive hours
import { el } from '../utils/dom.js';
import { store } from '../state/store.js';
import { getPeakHours } from '../services/analytics.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export function renderClockChart(container) {
  container.innerHTML = '';
  const section = el('div', { className: 'clock-section anim-fade-in' });

  section.appendChild(el('h2', {}, '🕐 Your Internal Clock'));

  const logs = store.getState().completionLogs;
  const peak = getPeakHours(logs);

  // Peak message
  const peakMsg = el('div', { className: 'peak-msg' });
  if (logs.length < 3) {
    peakMsg.innerHTML = 'Complete a few more tasks to discover your peak productivity hours.';
  } else {
    const formatHour = h => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour = h % 12 || 12;
      return `${hour}:00 ${ampm}`;
    };
    const top = peak.topHours;
    if (top.length > 0) {
      peakMsg.innerHTML = `Your most productive time is <strong>${formatHour(top[0])} – ${formatHour((top[top.length - 1] + 1) % 24)}</strong>`;
    }
  }
  section.appendChild(peakMsg);

  // Chart
  const chartWrap = el('div', { className: 'clock-chart-wrap' });
  const canvas = el('canvas', { id: 'clock-chart' });
  chartWrap.appendChild(canvas);
  section.appendChild(chartWrap);

  // Insights
  if (logs.length >= 3) {
    const insights = el('div', {
      className: 'summary-chart-wrap',
      style: 'margin-top:var(--sp-6);'
    });
    insights.appendChild(el('h3', {}, '💡 Insights'));
    const list = el('ul', { style: 'padding-left:var(--sp-5);' });
    const morningCount = Object.entries(peak.hourCounts).filter(([h]) => h >= 6 && h < 12).reduce((s, [, v]) => s + v, 0);
    const afternoonCount = Object.entries(peak.hourCounts).filter(([h]) => h >= 12 && h < 18).reduce((s, [, v]) => s + v, 0);
    const eveningCount = Object.entries(peak.hourCounts).filter(([h]) => h >= 18 && h < 24).reduce((s, [, v]) => s + v, 0);
    
    if (morningCount > afternoonCount && morningCount > eveningCount) {
      list.appendChild(el('li', { style: 'color:var(--text-secondary);font-size:var(--fs-sm);margin-bottom:var(--sp-2);' }, '☀️ You\'re a morning person — your best work happens before noon.'));
    } else if (afternoonCount > morningCount) {
      list.appendChild(el('li', { style: 'color:var(--text-secondary);font-size:var(--fs-sm);margin-bottom:var(--sp-2);' }, '🌤️ You hit your stride in the afternoon — schedule deep work after lunch.'));
    } else if (eveningCount > 0) {
      list.appendChild(el('li', { style: 'color:var(--text-secondary);font-size:var(--fs-sm);margin-bottom:var(--sp-2);' }, '🌙 You\'re a night owl — your focus peaks in the evening hours.'));
    }
    list.appendChild(el('li', { style: 'color:var(--text-secondary);font-size:var(--fs-sm);' }, `📊 Total tasks tracked: ${logs.length}`));
    insights.appendChild(list);
    section.appendChild(insights);
  }

  container.appendChild(section);

  requestAnimationFrame(() => {
    const labels = Array.from({ length: 24 }, (_, i) => {
      const ampm = i >= 12 ? 'PM' : 'AM';
      return `${i % 12 || 12} ${ampm}`;
    });
    const data = labels.map((_, i) => peak.hourCounts[i] || 0);

    new Chart(canvas, {
      type: 'polarArea',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map((v, i) => {
            const intensity = peak.maxCount > 0 ? v / peak.maxCount : 0;
            return `rgba(139,92,246,${0.1 + intensity * 0.6})`;
          }),
          borderColor: 'rgba(139,92,246,0.3)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          r: {
            ticks: { display: false },
            grid: { color: 'rgba(255,255,255,0.05)' }
          }
        }
      }
    });
  });
}
