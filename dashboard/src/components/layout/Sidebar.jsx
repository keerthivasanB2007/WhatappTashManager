import React from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useTasks } from '../../hooks/useTasks';
import { getTaskCategory } from '../../utils/taskUtils';

const icons = { TODAY: '☀', ALL: '▦', UPCOMING: '↗', OVERDUE: '!', HIGH_PRIORITY: '◆', COMPLETED: '✓', CALENDAR: '□', SENDERS: '♙' };

export default function Sidebar({ isCompact }) {
  const { currentView, setCurrentView, filter, setFilter, setSidebarCollapsed, sidebarCollapsed } = useAppState();
  const { globalTasks } = useTasks();

  const pending = globalTasks.filter(t => t.status !== 'COMPLETED');
  const counts = {
    ALL: globalTasks.length,
    UPCOMING: pending.filter(t => ['TOMORROW', 'THIS_WEEK', 'LATER'].includes(getTaskCategory(t))).length,
    OVERDUE: pending.filter(t => getTaskCategory(t) === 'OVERDUE').length,
    HIGH_PRIORITY: pending.filter(t => t.priority === 'HIGH').length,
    COMPLETED: globalTasks.filter(t => t.status === 'COMPLETED').length
  };

  const nav = [
    ['TODAY', 'Today'], ['ALL', 'All tasks'], ['UPCOMING', 'Upcoming'],
    ['OVERDUE', 'Overdue'], ['HIGH_PRIORITY', 'High priority'], ['COMPLETED', 'Completed']
  ];
  const go = key => { setCurrentView('TASKS'); setFilter(key); };

  const compact = isCompact || sidebarCollapsed;

  return (
    <aside className={`sidebar ${compact ? 'sidebar-compact' : ''}`}>
      <div className="brand">
        <span className="brand-mark">✓</span>
        {!compact && <span className="brand-text">Chat2Task</span>}
        <button className="collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label="Toggle sidebar">‹</button>
      </div>
      {!compact && <div className="nav-label">WORKSPACE</div>}
      <nav>
        {nav.map(([key, label]) => (
          <button key={key} title={label} className={`nav-item ${currentView === 'TASKS' && filter === key ? 'active' : ''}`} onClick={() => go(key)}>
            <i>{icons[key]}</i>
            {!compact && <span>{label}</span>}
            {!compact && counts[key] !== undefined && <b className={key === 'OVERDUE' ? 'danger' : ''}>{counts[key]}</b>}
          </button>
        ))}
      </nav>
      {!compact && <div className="nav-label">ORGANIZE</div>}
      <nav>
        <button title="Calendar" className={`nav-item ${currentView === 'CALENDAR' ? 'active' : ''}`} onClick={() => setCurrentView('CALENDAR')}>
          <i>{icons.CALENDAR}</i>
          {!compact && <span>Calendar</span>}
        </button>
        <button title="Sender groups" className={`nav-item ${filter === 'SENDERS' ? 'active' : ''}`} onClick={() => go('SENDERS')}>
          <i>{icons.SENDERS}</i>
          {!compact && <span>Sender groups</span>}
        </button>
      </nav>
      <div className="sidebar-bottom">
        <span className="online-dot" />
        {!compact && 'System online'}
      </div>
    </aside>
  );
}
