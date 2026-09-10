import React from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useTasks } from '../../hooks/useTasks';
import { getTaskCategory } from '../../utils/taskUtils';

export default function Sidebar() {
  const { currentView, setCurrentView, filter, setFilter, sidebarOpen, setSidebarOpen, backendStatus } = useAppState();
  const { globalTasks } = useTasks();

  const handleNav = (view, newFilter = '') => {
      setCurrentView(view);
      if (newFilter) setFilter(newFilter);
      setSidebarOpen(false);
  };

  // Calculate generic counts dynamically
  const overdueCount = globalTasks.filter(t => t.status === 'PENDING' && getTaskCategory(t) === 'OVERDUE').length;
  const highPriorityCount = globalTasks.filter(t => t.status === 'PENDING' && t.priority === 'HIGH').length;
  const pendingCount = globalTasks.filter(t => t.status === 'PENDING').length;
  const upcomingCount = pendingCount - overdueCount; // Pseudo logic matching general list length
  const completedCount = globalTasks.filter(t => t.status === 'COMPLETED').length;
  const totalCount = globalTasks.length;

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-section">
        <div className="sidebar-nav">
            <button className={`nav-item nav-item-dashboard ${currentView === 'TASKS' && filter === 'TODAY' ? 'active' : ''}`} onClick={() => handleNav('TASKS', 'TODAY')}>
               <span className="nav-icon">⌂</span> 
               <span className="nav-label">Dashboard</span>
            </button>
            <div className="sidebar-divider"></div>
            <button className={`nav-item ${currentView === 'TASKS' && filter === 'ALL' ? 'active' : ''}`} onClick={() => handleNav('TASKS', 'ALL')}>
               <span className="nav-icon">🗂️</span> 
               <span className="nav-label">All Tasks</span>
               <span className="nav-badge badge-blue">{totalCount}</span>
            </button>
            <button className={`nav-item ${currentView === 'TASKS' && filter === 'UPCOMING' ? 'active' : ''}`} onClick={() => handleNav('TASKS', 'UPCOMING')}>
               <span className="nav-icon">🕒</span> 
               <span className="nav-label">Upcoming</span>
               <span className="nav-badge badge-blue">{upcomingCount}</span>
            </button>
            <button className={`nav-item ${currentView === 'TASKS' && filter === 'OVERDUE' ? 'active' : ''}`} onClick={() => handleNav('TASKS', 'OVERDUE')}>
               <span className="nav-icon">🔥</span> 
               <span className="nav-label">Overdue</span>
               <span className="nav-badge badge-red">{overdueCount}</span>
            </button>
            <button className={`nav-item ${currentView === 'TASKS' && filter === 'HIGH_PRIORITY' ? 'active' : ''}`} onClick={() => handleNav('TASKS', 'HIGH_PRIORITY')}>
               <span className="nav-icon">⭐</span> 
               <span className="nav-label">High Priority</span>
               <span className="nav-badge badge-orange">{highPriorityCount}</span>
            </button>
            <button className={`nav-item ${currentView === 'TASKS' && filter === 'COMPLETED' ? 'active' : ''}`} onClick={() => handleNav('TASKS', 'COMPLETED')}>
               <span className="nav-icon">☑️</span> 
               <span className="nav-label">Completed</span>
               <span className="nav-badge badge-green">{completedCount}</span>
            </button>
            
            <div className="sidebar-divider"></div>

            <button className={`nav-item ${currentView === 'CALENDAR' ? 'active' : ''}`} onClick={() => handleNav('CALENDAR')}>
               <span className="nav-icon">📅</span> 
               <span className="nav-label">Calendar</span>
            </button>
            <button className={`nav-item ${currentView === 'SENDERS' ? 'active' : ''}`} onClick={() => handleNav('SENDERS')}>
               <span className="nav-icon">👥</span> 
               <span className="nav-label">Sender Groups</span>
            </button>
            <button className={`nav-item`} onClick={() => alert('Settings')}>
               <span className="nav-icon">⚙️</span> 
               <span className="nav-label">Settings</span>
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
