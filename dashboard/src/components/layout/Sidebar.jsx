import React from 'react';
import { useAppState } from '../../hooks/useAppState';

export default function Sidebar() {
  const { currentView, setCurrentView, filter, setFilter, sidebarOpen, setSidebarOpen, backendStatus } = useAppState();

  const handleNav = (view, newFilter = '') => {
      setCurrentView(view);
      if (newFilter) setFilter(newFilter);
      setSidebarOpen(false);
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-section">
        <div className="sidebar-label">WORKSPACE</div>
        <div className="sidebar-nav">
            <button className={`nav-item ${currentView === 'TASKS' && filter === 'TODAY' ? 'active' : ''}`} onClick={() => handleNav('TASKS', 'TODAY')}>
               <span className="nav-icon">⭐</span> Today
            </button>
            <button className={`nav-item ${currentView === 'TASKS' && filter === 'ALL' ? 'active' : ''}`} onClick={() => handleNav('TASKS', 'ALL')}>
               <span className="nav-icon">📅</span> All Tasks
            </button>
            <button className={`nav-item ${currentView === 'TASKS' && filter === 'UPCOMING' ? 'active' : ''}`} onClick={() => handleNav('TASKS', 'UPCOMING')}>
               <span className="nav-icon">⏭️</span> Upcoming
            </button>
            <button className={`nav-item ${currentView === 'TASKS' && filter === 'OVERDUE' ? 'active' : ''}`} onClick={() => handleNav('TASKS', 'OVERDUE')}>
               <span className="nav-icon">⚠️</span> Overdue
            </button>
            <button className={`nav-item ${currentView === 'TASKS' && filter === 'HIGH_PRIORITY' ? 'active' : ''}`} onClick={() => handleNav('TASKS', 'HIGH_PRIORITY')}>
               <span className="nav-icon">🔥</span> High Priority
            </button>
            <button className={`nav-item ${currentView === 'TASKS' && filter === 'COMPLETED' ? 'active' : ''}`} onClick={() => handleNav('TASKS', 'COMPLETED')}>
               <span className="nav-icon">✅</span> Completed
            </button>
            <button className={`nav-item ${currentView === 'CALENDAR' ? 'active' : ''}`} onClick={() => handleNav('CALENDAR')}>
               <span className="nav-icon">🗓️</span> Calendar
            </button>
            <button className={`nav-item ${currentView === 'SENDERS' ? 'active' : ''}`} onClick={() => handleNav('SENDERS')}>
               <span className="nav-icon">👥</span> Sender Groups
            </button>
        </div>
      </div>
      
      <div className="sidebar-footer">
          <div className={`status-indicator ${backendStatus === 'Connected' ? 'status-online' : 'status-offline'}`}>
            <div className="status-dot"></div>
            Backend {backendStatus}
          </div>
      </div>
    </aside>
  );
}
