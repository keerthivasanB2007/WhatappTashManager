import React, { useState, useEffect } from 'react';
import { getTasks, updateTaskStatus, deleteTask, getReminders } from './api/tasksApi';
import Login from './components/Login.jsx';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [globalTasks, setGlobalTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [reminders, setReminders] = useState([]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const globalData = await getTasks();
      setGlobalTasks(globalData.tasks || []);

      let query = '';
      if (filter === 'PENDING') query = 'status=PENDING';
      else if (filter === 'COMPLETED') query = 'status=COMPLETED';
      else if (filter === 'HIGH') query = 'priority=HIGH';

      if (query === '') {
         setFilteredTasks(globalData.tasks || []);
      } else {
         const data = await getTasks(query);
         setFilteredTasks(data.tasks || []);
      }

      // Fetch active reminders
      try {
        const rData = await getReminders();
        setReminders(rData.reminders || []);
      } catch (e) {
        console.warn("Reminders fetch failed", e);
      }

    } catch (err) {
      setError('Unable to connect to the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
        fetchTasks();
    }
  }, [filter, isAuthenticated]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateTaskStatus(id, newStatus);
      fetchTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask(id);
        fetchTasks();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 86400000;
  const startOfDayAfter = startOfTomorrow + 86400000;

  const getTaskCategory = (task) => {
    if (task.status === 'COMPLETED') return 'COMPLETED';
    if (!task.deadline) return 'UPCOMING';
    const d = new Date(task.deadline).getTime();
    if (isNaN(d)) return 'UPCOMING'; 

    if (d < startOfToday) return 'OVERDUE';
    if (d >= startOfToday && d < startOfTomorrow) return 'TODAY';
    if (d >= startOfTomorrow && d < startOfDayAfter) return 'TOMORROW';
    return 'UPCOMING';
  };

  const totalTasks = globalTasks.length;
  const pendingTasks = globalTasks.filter(t => t.status === 'PENDING').length;
  const completedTasks = globalTasks.filter(t => t.status === 'COMPLETED').length;
  const overdueTasks = globalTasks.filter(t => t.status === 'PENDING' && t.deadline && new Date(t.deadline).getTime() < startOfToday).length;
  const highPriorityTasks = globalTasks.filter(t => t.status === 'PENDING' && t.priority === 'HIGH').length;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No deadline';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'No deadline' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const query = searchQuery.toLowerCase();
  const searchedTasks = filteredTasks.filter(t => {
    if (!query) return true;
    return (
      (t.task && t.task.toLowerCase().includes(query)) ||
      (t.originalMessage && t.originalMessage.toLowerCase().includes(query)) ||
      (t.sender && t.sender.toLowerCase().includes(query)) ||
      (t.category && t.category.toLowerCase().includes(query))
    );
  });

  const sections = {
    OVERDUE: searchedTasks.filter(t => getTaskCategory(t) === 'OVERDUE'),
    TODAY: searchedTasks.filter(t => getTaskCategory(t) === 'TODAY'),
    TOMORROW: searchedTasks.filter(t => getTaskCategory(t) === 'TOMORROW'),
    UPCOMING: searchedTasks.filter(t => getTaskCategory(t) === 'UPCOMING'),
    COMPLETED: searchedTasks.filter(t => getTaskCategory(t) === 'COMPLETED')
  };

  const renderTaskCard = (task) => (
    <div className="task-item" key={task.id}>
      <div className="task-item-header">
        <h3 className="task-title">{task.task || 'Unnamed Task'}</h3>
        <span className={`task-status-badge badge-${task.status.toLowerCase()}`}>{task.status}</span>
      </div>
      
      {task.originalMessage && (
        <p className="task-original">"{task.originalMessage}"</p>
      )}

      <div className="task-meta-row">
        <div className="meta-chip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          {task.sender}
        </div>
        <div className={`meta-chip priority-${task.priority?.toLowerCase() || 'low'}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          {task.priority || 'LOW'}
        </div>
        {task.category && (
          <div className="meta-chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            {task.category}
          </div>
        )}
        <div className="meta-chip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          {formatDate(task.deadline)}
        </div>
      </div>

      <div className="task-actions-row">
        {task.status === 'PENDING' ? (
          <button className="btn-action btn-complete" onClick={() => handleStatusChange(task.id, 'COMPLETED')}>Complete</button>
        ) : (
          <button className="btn-action btn-pending" onClick={() => handleStatusChange(task.id, 'PENDING')}>Mark Pending</button>
        )}
        <button className="btn-action btn-delete" onClick={() => handleDelete(task.id)}>Delete</button>
      </div>
    </div>
  );

  const handleLogout = () => {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
     return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>WhatsApp Task Manager</h2>
          <p>Your tasks captured from WhatsApp, organized in one place.</p>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-item active"><span className="nav-icon">⊞</span> Dashboard</div>
          <div className="nav-item"><span className="nav-icon">✓</span> Tasks</div>
          <div className="nav-item"><span className="nav-icon">📅</span> Calendar</div>
          <div className="nav-item"><span className="nav-icon">📊</span> Analytics</div>
          <div className="nav-item"><span className="nav-icon">⚡</span> Activity</div>
          <div className="nav-item" style={{marginTop: 'auto', marginBottom: '8px'}}><span className="nav-icon">⚙</span> Settings</div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
          <div className="summary-cards">
            <div className="stat-card">
              <span className="stat-label">Total</span>
              <span className="stat-val">{totalTasks}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Pending</span>
              <span className="stat-val">{pendingTasks}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Completed</span>
              <span className="stat-val">{completedTasks}</span>
            </div>
            <div className="stat-card overdue">
              <span className="stat-label">Overdue</span>
              <span className="stat-val" style={{color: 'var(--status-overdue)'}}>{overdueTasks}</span>
            </div>
            <div className="stat-card high-priority">
              <span className="stat-label">High Priority</span>
              <span className="stat-val" style={{color: 'var(--status-high)'}}>{highPriorityTasks}</span>
            </div>
          </div>

          {reminders.length > 0 && (
            <div className="reminders-banner">
              <div className="reminders-title">Next Reminders ({reminders.length})</div>
              <ul className="reminders-list">
                {reminders.map(r => (
                  <li key={r.taskId}>
                    <strong>{r.title}</strong> — Due {formatDate(r.deadline)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </header>

        <section className="content-area">
          <div className="toolbar">
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search tasks, messages, senders, or categories..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="filters-group">
              {['ALL', 'PENDING', 'COMPLETED', 'HIGH'].map(f => (
                <button 
                  key={f} 
                  className={`filter-btn ${filter === f ? 'active' : ''}`} 
                  onClick={() => setFilter(f)}
                >
                  {f === 'HIGH' ? 'High Priority' : f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="task-list">
            {loading && <div className="loading-state">Loading tasks...</div>}
            {error && (
              <div className="error-banner">
                {error}
                <div><button className="btn-retry" onClick={fetchTasks}>Retry</button></div>
              </div>
            )}
            
            {!loading && !error && searchedTasks.length === 0 && (
              <div className="empty-state">
                {searchQuery ? 'No tasks match your search.' : filter === 'PENDING' ? 'No pending tasks.' : filter === 'COMPLETED' ? 'No completed tasks.' : 'Messages containing actionable tasks will appear here automatically.'}
              </div>
            )}

            {!loading && !error && (
              <>
                {sections.OVERDUE.length > 0 && (
                  <div className="task-section">
                    <div className="section-label" style={{color: 'var(--status-overdue)'}}>Overdue</div>
                    <div className="task-list-grid">
                       {sections.OVERDUE.map(renderTaskCard)}
                    </div>
                  </div>
                )}
                {sections.TODAY.length > 0 && (
                  <div className="task-section">
                    <div className="section-label">Today</div>
                    <div className="task-list-grid">
                       {sections.TODAY.map(renderTaskCard)}
                    </div>
                  </div>
                )}
                {sections.TOMORROW.length > 0 && (
                  <div className="task-section">
                    <div className="section-label">Tomorrow</div>
                    <div className="task-list-grid">
                       {sections.TOMORROW.map(renderTaskCard)}
                    </div>
                  </div>
                )}
                {sections.UPCOMING.length > 0 && (
                  <div className="task-section">
                    <div className="section-label">Upcoming</div>
                    <div className="task-list-grid">
                       {sections.UPCOMING.map(renderTaskCard)}
                    </div>
                  </div>
                )}
                {sections.COMPLETED.length > 0 && (
                  <div className="task-section">
                    <div className="section-label">Completed</div>
                    <div className="task-list-grid">
                       {sections.COMPLETED.map(renderTaskCard)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
