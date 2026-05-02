// Sidebar Navigation
import { el, $ } from '../utils/dom.js';
import { store } from '../state/store.js';

const NAV_ITEMS = [
  { id: 'tasks', icon: '📋', label: 'Tasks' },
  { id: 'analytics', icon: '📊', label: 'Analytics' },
  { id: 'clock', icon: '🕐', label: 'My Clock' },
];

export function renderSidebar() {
  const sidebar = $('#sidebar');
  sidebar.innerHTML = '';

  // Logo
  const logo = el('div', { className: 'sidebar-logo' },
    el('h1', {}, '⚡ FlowList'),
    el('span', {}, 'AI-Powered Productivity')
  );
  sidebar.appendChild(logo);

  // Nav
  const nav = el('nav', { className: 'sidebar-nav' });
  NAV_ITEMS.forEach(item => {
    const btn = el('div', {
      className: `nav-item ${store.getState().currentView === item.id ? 'active' : ''}`,
      dataset: { view: item.id },
      onClick: () => {
        store.setState({ currentView: item.id });
      }
    },
      el('span', { className: 'nav-icon' }, item.icon),
      el('span', {}, item.label)
    );
    nav.appendChild(btn);
  });

  // Settings button
  const settingsBtn = el('div', {
    className: 'nav-item',
    onClick: () => {
      store.setState({ currentView: 'settings' });
    }
  },
    el('span', { className: 'nav-icon' }, '⚙️'),
    el('span', {}, 'Settings')
  );
  nav.appendChild(settingsBtn);
  sidebar.appendChild(nav);

  // Footer
  const footer = el('div', { className: 'sidebar-footer' },
    el('span', { className: 'version' }, 'FlowList v1.0')
  );
  sidebar.appendChild(footer);
}
