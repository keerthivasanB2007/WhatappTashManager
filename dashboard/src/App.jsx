import React, { useState, useEffect } from 'react';
import { getTasks, updateTaskStatus, deleteTask, getReminders, checkHealth } from './api/tasksApi';
import Login from './components/Login.jsx';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [globalTasks, setGlobalTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filter, setFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [reminders, setReminders] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [currentView, setCurrentView] = useState('TASKS'); // 'TASKS' or 'CALENDAR'
  const [toastMessage, setToastMessage] = useState(null);
  
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // Calendar States
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const globalData = await getTasks();
      const fetchedTasks = globalData.tasks || [];
      setGlobalTasks(fetchedTasks);
      setFilteredTasks(fetchedTasks);

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
    let mounted = true;
    checkHealth()
      .then(() => mounted && setBackendStatus('Connected'))
      .catch(() => mounted && setBackendStatus('Offline'));
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
        fetchTasks();
    }
  }, [isAuthenticated]);

  const handleStatusChange = async (e, id, newStatus) => {
    e.stopPropagation();
    
    // Optimistic Update
    const previousGlobalTasks = [...globalTasks];
    setGlobalTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    if (selectedTask && selectedTask.id === id) {
      setSelectedTask(prev => ({...prev, status: newStatus}));
    }

    try {
      await updateTaskStatus(id, newStatus);
    } catch (err) {
      setGlobalTasks(previousGlobalTasks);
      if (selectedTask && selectedTask.id === id) {
        setSelectedTask(previousGlobalTasks.find(t => t.id === id) || null);
      }
      showToast('Failed to update task: ' + err.message);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask(id);
        setGlobalTasks(prev => prev.filter(t => t.id !== id));
        if (selectedTask && selectedTask.id === id) setSelectedTask(null);
      } catch (err) {
        showToast('Failed to delete task: ' + err.message);
      }
    }
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 86400000;
  const startOfDayAfter = startOfTomorrow + 86400000;

  const getTaskCategory = (task) => {
    if (!task.deadline) return 'NO_DEADLINE';
    const d = new Date(task.deadline).getTime();
    if (isNaN(d)) return 'NO_DEADLINE'; 

    if (d < startOfToday) return 'OVERDUE';
    if (d >= startOfToday && d < startOfTomorrow) return 'TODAY';
    if (d >= startOfTomorrow && d < startOfDayAfter) return 'TOMORROW';
    
    const startOfNextWeek = startOfToday + (7 * 86400000); 
    if (d >= startOfDayAfter && d < startOfNextWeek) return 'THIS_WEEK';
    
    return 'LATER';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No deadline';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'No deadline' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const formatDeadlineBanner = (task) => {
    if (task.status === 'COMPLETED') return formatDate(task.deadline);
    const cat = getTaskCategory(task);
    if (!task.deadline || cat === 'NO_DEADLINE') return 'No deadline';

    const d = new Date(task.deadline).getTime();
    if (cat === 'OVERDUE') {
      const days = Math.floor((startOfToday - d) / 86400000);
      return days > 0 ? `Overdue by ${days} day${days > 1 ? 's' : ''}` : 'Overdue';
    }
    if (cat === 'TODAY') return 'Due today';
    if (cat === 'TOMORROW') return 'Due tomorrow';
    
    if (d > startOfDayAfter) {
      const days = Math.ceil((d - startOfToday) / 86400000);
      return `Due in ${days} days`;
    }

    return formatDate(task.deadline);
  };

  const query = searchQuery.toLowerCase();
  
  let fullyProcessedTasks = globalTasks.filter(t => {
    // 1. Text Search
    if (query) {
      const match = (t.task && t.task.toLowerCase().includes(query)) ||
        (t.originalMessage && t.originalMessage.toLowerCase().includes(query)) ||
        (t.sender && t.sender.toLowerCase().includes(query)) ||
        (t.category && t.category.toLowerCase().includes(query));
      if (!match) return false;
    }

    // 2. State Filters
    if (filter === 'PENDING' && (t.status === 'COMPLETED' || getTaskCategory(t) === 'OVERDUE')) return false;
    if (filter === 'COMPLETED' && t.status !== 'COMPLETED') return false;
    if (filter === 'HIGH' && t.priority !== 'HIGH') return false;
    if (filter === 'DUE_TODAY' && getTaskCategory(t) !== 'TODAY') return false;
    if (filter === 'OVERDUE' && (t.status === 'COMPLETED' || getTaskCategory(t) !== 'OVERDUE')) return false;
    
    return true;
  });

  // 3. Sorting
  fullyProcessedTasks.sort((a, b) => {
    if (sortBy === 'deadline') {
       if (!a.deadline && !b.deadline) return 0;
       if (!a.deadline) return 1;
       if (!b.deadline) return -1;
       return new Date(a.deadline) - new Date(b.deadline);
    } else if (sortBy === 'priority') {
       const p = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
       const pA = p[a.priority] || 1;
       const pB = p[b.priority] || 1;
       if (pA !== pB) return pB - pA;
       return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    } else {
       // recent
       return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
  });

  // 4. DISPLAY-ONLY Deduplication Helper
  const getUniqueTasks = (tasks) => {
    const getNormalizedString = (str) => (str || '').trim().replace(/\s+/g, ' ').toLowerCase();

    const uniqueTasks = [];
    const seenOriginalMessages = new Set();
    const seenTitlesWithDeadlines = new Set();
    const seenIds = new Set();

    for (const t of tasks) {
      if (seenIds.has(t.id)) continue;
      
      const sender = (t.sender || '').trim().toLowerCase();
      const deadlineTime = t.deadline ? new Date(t.deadline).getTime() : 'no_deadline';
      
      const normMsg = t.originalMessage ? getNormalizedString(t.originalMessage) : '';
      // Require sender + exact originalMessage + same deadline
      const msgKey = normMsg ? `msg_${sender}_${normMsg}_${deadlineTime}` : null;
      
      const normTitle = t.task ? getNormalizedString(t.task) : '';
      // Require sender + exact title + same deadline
      const titleKey = normTitle ? `title_${sender}_${normTitle}_${deadlineTime}` : null;
      
      let isDuplicate = false;
      
      if (msgKey && seenOriginalMessages.has(msgKey)) {
        isDuplicate = true;
      } else if (titleKey && seenTitlesWithDeadlines.has(titleKey)) {
        isDuplicate = true;
      }
      
      if (!isDuplicate) {
        seenIds.add(t.id);
        if (msgKey) seenOriginalMessages.add(msgKey);
        if (titleKey) seenTitlesWithDeadlines.add(titleKey);
        uniqueTasks.push(t);
      }
    }
    return uniqueTasks;
  };

  fullyProcessedTasks = getUniqueTasks(fullyProcessedTasks);

  const isFiltering = filter !== 'ALL' || searchQuery !== '';

  const sections = {
    OVERDUE: fullyProcessedTasks.filter(t => t.status !== 'COMPLETED' && getTaskCategory(t) === 'OVERDUE'),
    TODAY: fullyProcessedTasks.filter(t => getTaskCategory(t) === 'TODAY'),
    UPCOMING: {
       TOMORROW: fullyProcessedTasks.filter(t => t.status !== 'COMPLETED' && getTaskCategory(t) === 'TOMORROW'),
       THIS_WEEK: fullyProcessedTasks.filter(t => t.status !== 'COMPLETED' && getTaskCategory(t) === 'THIS_WEEK'),
       LATER: fullyProcessedTasks.filter(t => t.status !== 'COMPLETED' && getTaskCategory(t) === 'LATER'),
    },
    NO_DEADLINE: fullyProcessedTasks.filter(t => t.status !== 'COMPLETED' && getTaskCategory(t) === 'NO_DEADLINE'),
    COMPLETED_PAST: fullyProcessedTasks.filter(t => t.status === 'COMPLETED' && getTaskCategory(t) !== 'TODAY')
  };

  const renderTaskCard = (task) => (
    <div className={`task-item ${task.status === 'COMPLETED' ? 'task-item-completed' : ''}`} key={task.id} onClick={() => setSelectedTask(task)}>
      <div className="task-item-header">
        <h3 className="task-title">{task.task || 'Unnamed Task'}</h3>
        <span className={`task-status-badge badge-${task.status.toLowerCase()}`}>{task.status}</span>
      </div>
      
      {task.originalMessage && (
        <p className="task-original">"{task.originalMessage.length > 80 ? task.originalMessage.substring(0, 80) + '...' : task.originalMessage}"</p>
      )}

      <div className="task-meta-divider"></div>

      <div className="task-card-footer">
        <div className="task-meta-row">
          <div className="meta-chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            {task.sender}
          </div>
          {task.priority === 'HIGH' && (
            <div className={`meta-chip priority-high`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              HIGH
            </div>
          )}
          {task.category && (
            <div className="meta-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              {task.category}
            </div>
          )}
          <div className={`meta-chip ${task.status !== 'COMPLETED' && getTaskCategory(task) === 'OVERDUE' ? 'status-overdue-tag' : task.status !== 'COMPLETED' && getTaskCategory(task) === 'TODAY' ? 'status-today-tag' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            {formatDeadlineBanner(task)}
            {task.status === 'PENDING' && task.deadline && getTaskCategory(task) !== 'OVERDUE' && <span className="reminder-bell-icon">🔔</span>}
          </div>
        </div>

        <div className="task-actions-row">
          <button className={`btn-action ${task.status === 'PENDING' ? 'btn-complete' : 'btn-pending'}`} onClick={(e) => handleStatusChange(e, task.id, task.status === 'PENDING' ? 'COMPLETED' : 'PENDING')}>
            {task.status === 'PENDING' ? 'Complete' : 'Mark Pending'}
          </button>
          <button className="btn-action btn-delete" onClick={(e) => handleDelete(e, task.id)}>Delete</button>
        </div>
      </div>
    </div>
  );

  const renderSkeleton = () => (
    <div className="task-list-grid">
      {[1, 2, 3].map(i => (
        <div className="task-item skeleton-item" key={i}>
          <div className="skeleton-title"></div>
          <div className="skeleton-text"></div>
          <div className="skeleton-text short"></div>
          <div className="skeleton-row">
            <div className="skeleton-chip"></div>
            <div className="skeleton-chip"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const handleLogout = () => {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
     return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Build days array mapping
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Deduplicate calendar views based on chronological sort (recent first bias for conflicts)
    const uniqueCalendarTasks = getUniqueTasks([...globalTasks].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));

    // Group tasks per date
    const tasksByDate = {};
    uniqueCalendarTasks.forEach(t => {
      if (!t.deadline) return;
      const d = new Date(t.deadline);
      if (isNaN(d.getTime())) return;
      
      const localStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!tasksByDate[localStr]) tasksByDate[localStr] = [];
      tasksByDate[localStr].push(t);
    });

    return (
      <div className="calendar-view">
        <div className="calendar-header">
          <h2>{monthName}</h2>
          <div className="calendar-nav-btns">
            <button className="cal-nav-btn" onClick={() => setCalendarDate(new Date(year, month - 1, 1))}>&lt;</button>
            <button className="cal-today-btn" onClick={() => { setCalendarDate(new Date()); setSelectedCalendarDate(new Date()); }}>Today</button>
            <button className="cal-nav-btn" onClick={() => setCalendarDate(new Date(year, month + 1, 1))}>&gt;</button>
          </div>
        </div>
        
        <div className="calendar-grid-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>
        
        <div className="calendar-grid">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="cal-cell empty"></div>;
            
            const localStr = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const dayTasks = tasksByDate[localStr] || [];
            const isToday = day.getTime() === todayMs;
            const isSelected = selectedCalendarDate && day.getTime() === new Date(selectedCalendarDate.getFullYear(), selectedCalendarDate.getMonth(), selectedCalendarDate.getDate()).getTime();
            const isPast = day.getTime() < todayMs;
            
            let cellClass = "cal-cell";
            if (isToday) cellClass += " is-today";
            if (isSelected) cellClass += " is-selected";
            
            return (
              <div key={localStr} className={cellClass} onClick={() => setSelectedCalendarDate(day)}>
                <div className="cal-date-num">{day.getDate()}</div>
                <div className="cal-indicators">
                  {dayTasks.length > 0 && dayTasks.slice(0, 3).map((t, i) => {
                     const isCompleted = t.status === 'COMPLETED';
                     return (
                       <div key={i} className={`cal-task-dot ${isCompleted ? 'cal-task-completed' : `priority-${t.priority?.toLowerCase() || 'low'}`}`} title={t.task}>
                          {t.task}
                       </div>
                     );
                  })}
                  {dayTasks.length > 3 && (
                     <div className="cal-task-more">+{dayTasks.length - 3} more</div>
                  )}
                  {dayTasks.length > 0 && isPast && (
                     <div className="cal-overdue-alert">Overdue</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Render Selected Day Tasks */}
        {selectedCalendarDate && (
          <div className="calendar-selected-tasks">
            <h3>Tasks for {selectedCalendarDate.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}</h3>
            <div className="task-list-grid">
              {uniqueCalendarTasks.filter(t => {
                if (!t.deadline) return false;
                const d = new Date(t.deadline);
                if (isNaN(d.getTime())) return false;
                return d.getFullYear() === selectedCalendarDate.getFullYear() && d.getMonth() === selectedCalendarDate.getMonth() && d.getDate() === selectedCalendarDate.getDate();
              }).length === 0 ? (
                <div className="empty-state" style={{padding: '24px'}}>No pending tasks here.</div>
              ) : (
                uniqueCalendarTasks.filter(t => {
                  if (!t.deadline) return false;
                  const d = new Date(t.deadline);
                  if (isNaN(d.getTime())) return false;
                  return d.getFullYear() === selectedCalendarDate.getFullYear() && d.getMonth() === selectedCalendarDate.getMonth() && d.getDate() === selectedCalendarDate.getDate();
                }).map(renderTaskCard)
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>WhatsAppTaskManager</h2>
          <p>Your tasks captured from WhatsApp, organized in one place.</p>
        </div>
        <nav className="sidebar-nav">
          <div className={`nav-item ${currentView === 'TASKS' ? 'active' : ''}`} onClick={() => setCurrentView('TASKS')} style={{cursor: 'pointer'}}>
            <span className="nav-icon">⊞</span> Tasks
          </div>
          <div className={`nav-item ${currentView === 'CALENDAR' ? 'active' : ''}`} onClick={() => setCurrentView('CALENDAR')} style={{cursor: 'pointer'}}>
            <span className="nav-icon">📅</span> Calendar
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className={`status-indicator ${backendStatus === 'Connected' ? 'status-online' : backendStatus === 'Offline' ? 'status-offline' : ''}`}>
            <span className="status-dot"></span> Backend {backendStatus}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-top">
            <div className="account-dropdown-wrapper">
               <button className="account-dropdown-btn" onClick={() => setAccountMenuOpen(!accountMenuOpen)}>
                  <div className="account-avatar">A</div>
                  <span className="account-label">Account</span>
                  <span className="account-chev">˅</span>
               </button>
               {accountMenuOpen && (
                 <>
                   <div className="account-dropdown-overlay" onClick={() => setAccountMenuOpen(false)}></div>
                   <div className="account-dropdown-menu">
                     <div className="account-dropdown-header">
                       <span className="account-dropdown-name">Account</span>
                       <span className="account-dropdown-status">Signed in</span>
                     </div>
                     <div className="account-dropdown-actions">
                       <button className="account-dropdown-item" onClick={() => { setAccountMenuOpen(false); handleLogout(); }}>
                         ↪ Log out
                       </button>
                     </div>
                   </div>
                 </>
               )}
            </div>
          </div>
          <div className="summary-cards">
            <div className="stat-card">
              <span className="stat-label">Total</span>
              <span className="stat-val">{globalTasks.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Pending</span>
              <span className="stat-val">{globalTasks.filter(t => t.status !== 'COMPLETED' && (!t.deadline || new Date(t.deadline).getTime() >= startOfToday)).length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Completed</span>
              <span className="stat-val">{globalTasks.filter(t => t.status === 'COMPLETED').length}</span>
            </div>
            <div className="stat-card overdue">
              <span className="stat-label">Overdue</span>
              <span className="stat-val" style={{color: 'var(--status-overdue)'}}>{globalTasks.filter(t => t.status !== 'COMPLETED' && t.deadline && new Date(t.deadline).getTime() < startOfToday).length}</span>
            </div>
            <div className="stat-card high-priority">
              <span className="stat-label">High Priority</span>
              <span className="stat-val" style={{color: 'var(--status-high)'}}>{globalTasks.filter(t => t.status === 'PENDING' && t.priority === 'HIGH').length}</span>
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
            <div className="search-input-wrapper">
              <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search tasks, messages..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="search-hint">⌘ K</span>
            </div>
            <div className="filters-group">
              <div className="filter-btn-group">
                {['ALL', 'PENDING', 'COMPLETED', 'HIGH', 'DUE_TODAY', 'OVERDUE'].map(f => (
                  <button 
                    key={f} 
                    className={`filter-btn ${filter === f ? 'active' : ''}`} 
                    onClick={() => setFilter(f)}
                  >
                    {f === 'HIGH' ? 'High Priority' : f === 'DUE_TODAY' ? 'Due Today' : f === 'OVERDUE' ? 'Overdue' : f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <div className="sort-group">
                <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="recent">Recent</option>
                  <option value="deadline">Deadline</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            </div>
          </div>

          {currentView === 'TASKS' ? (
            <div className="task-list">
              {loading && renderSkeleton()}
              {error && (
                <div className="error-banner">
                  <div>Unable to load tasks</div>
                  <div style={{fontSize: '0.8rem', opacity: 0.8, margin: '4px 0 12px 0'}}>Please check your backend connection and try again.</div>
                  <div><button className="btn-retry" onClick={fetchTasks}>Retry</button></div>
                </div>
              )}
              
              {!loading && !error && fullyProcessedTasks.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">No tasks yet</div>
                  <div className="empty-state-text">
                    {searchQuery ? 'No tasks match your search.' : filter === 'PENDING' ? 'No pending tasks found.' : filter === 'COMPLETED' ? 'No completed tasks found.' : 'When WhatsApp messages containing actionable tasks are detected, they\'ll appear here.'}
                  </div>
                </div>
              )}

              {!loading && !error && (
                <>
                  {sections.OVERDUE.length > 0 || !isFiltering ? (
                    <div className="task-section">
                      <div className="section-label" style={{color: 'var(--status-overdue)'}}>Overdue</div>
                      {sections.OVERDUE.length === 0 ? (
                        <div className="empty-state-inline">You have zero overdue tasks! Great job.</div>
                      ) : (
                        <div className="task-list-grid">{sections.OVERDUE.map(renderTaskCard)}</div>
                      )}
                    </div>
                  ) : null}

                  {sections.TODAY.length > 0 || !isFiltering ? (
                    <div className="task-section">
                      <div className="section-label">Today</div>
                      {sections.TODAY.length === 0 ? (
                        <div className="empty-state-inline">No tasks due today. Enjoy your day!</div>
                      ) : (
                        <div className="task-list-grid">{sections.TODAY.map(renderTaskCard)}</div>
                      )}
                    </div>
                  ) : null}

                  {(sections.UPCOMING.TOMORROW.length > 0 || sections.UPCOMING.THIS_WEEK.length > 0 || sections.UPCOMING.LATER.length > 0) || !isFiltering ? (
                    <div className="task-section">
                      <div className="section-label">Upcoming</div>
                      {sections.UPCOMING.TOMORROW.length === 0 && sections.UPCOMING.THIS_WEEK.length === 0 && sections.UPCOMING.LATER.length === 0 ? (
                        <div className="empty-state-inline">No upcoming tasks scheduled yet.</div>
                      ) : (
                        <div className="task-list-grid">
                           {sections.UPCOMING.TOMORROW.length > 0 && <div className="sub-label">Tomorrow</div>}
                           {sections.UPCOMING.TOMORROW.map(renderTaskCard)}

                           {sections.UPCOMING.THIS_WEEK.length > 0 && <div className="sub-label">This Week</div>}
                           {sections.UPCOMING.THIS_WEEK.map(renderTaskCard)}

                           {sections.UPCOMING.LATER.length > 0 && <div className="sub-label">Later</div>}
                           {sections.UPCOMING.LATER.map(renderTaskCard)}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {sections.NO_DEADLINE.length > 0 && (
                    <div className="task-section">
                      <div className="section-label">No Deadline</div>
                      <div className="task-list-grid">{sections.NO_DEADLINE.map(renderTaskCard)}</div>
                    </div>
                  )}

                  {sections.COMPLETED_PAST.length > 0 && (
                    <div className="task-section">
                      <div className="section-label">Previously Completed</div>
                      <div className="task-list-grid">{sections.COMPLETED_PAST.map(renderTaskCard)}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            renderCalendar()
          )}
        </section>
      </main>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>TASK DETAILS</h2>
              <button className="modal-close" onClick={() => setSelectedTask(null)}>✕</button>
            </div>
            <div className="modal-content">
              <h3 className="modal-task-title">{selectedTask.task || 'Unnamed Task'}</h3>
              
              <div className="modal-meta-grid">
                <div className="modal-meta-item">
                  <span className="modal-meta-label">Priority</span>
                  <span className={`modal-meta-value priority-${selectedTask.priority?.toLowerCase() || 'low'}`}>{selectedTask.priority || 'LOW'} PRIORITY</span>
                </div>
                <div className="modal-meta-item">
                  <span className="modal-meta-label">Status</span>
                  <span className={`modal-meta-value badge-${selectedTask.status.toLowerCase()}`}>{selectedTask.status}</span>
                </div>
                <div className="modal-meta-item">
                  <span className="modal-meta-label">Deadline</span>
                  <span className="modal-meta-value">{formatDate(selectedTask.deadline)}</span>
                </div>
                <div className="modal-meta-item">
                  <span className="modal-meta-label">Category</span>
                  <span className="modal-meta-value">{selectedTask.category || 'N/A'}</span>
                </div>
                <div className="modal-meta-item">
                  <span className="modal-meta-label">Reminder</span>
                  <span className="modal-meta-value" style={{color: selectedTask.status === 'PENDING' && selectedTask.deadline && getTaskCategory(selectedTask) !== 'OVERDUE' ? 'var(--status-success, #10B981)' : 'var(--text-secondary)'}}>
                    {selectedTask.status === 'PENDING' && selectedTask.deadline && getTaskCategory(selectedTask) !== 'OVERDUE' ? '🔔 Reminder Set (Native)' : 'No Reminder'}
                  </span>
                </div>
                <div className="modal-meta-item">
                  <span className="modal-meta-label">Created Date</span>
                  <span className="modal-meta-value">{formatDate(selectedTask.createdAt || selectedTask.receivedAt)}</span>
                </div>
                <div className="modal-meta-item">
                  <span className="modal-meta-label">Source</span>
                  <span className="modal-meta-value">{selectedTask.source || 'WhatsApp'}</span>
                </div>
                <div className="modal-meta-item">
                  <span className="modal-meta-label">Sender</span>
                  <span className="modal-meta-value">{selectedTask.sender}</span>
                </div>
              </div>

              <div className="modal-divider"></div>

              <div className="modal-original-msg">
                <span className="modal-meta-label">Original message</span>
                <p>"{selectedTask.originalMessage}"</p>
              </div>
              
              <div className="modal-actions">
                <span className="modal-actions-label">Actions:</span>
                <div className="task-actions-row" style={{marginTop: 0}}>
                  {selectedTask.status === 'PENDING' ? (
                    <button className="btn-action btn-complete" onClick={(e) => handleStatusChange(e, selectedTask.id, 'COMPLETED')}>Complete</button>
                  ) : (
                    <button className="btn-action btn-pending" onClick={(e) => handleStatusChange(e, selectedTask.id, 'PENDING')}>Mark Pending</button>
                  )}
                  <button className="btn-action btn-delete" onClick={(e) => handleDelete(e, selectedTask.id)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
