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
  const [calendarView, setCalendarView] = useState('Month'); // 'Month' or 'Agenda'
  const [toastMessage, setToastMessage] = useState(null);
  
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setAccountMenuOpen(false);
        setSidebarOpen(false);
      }
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
    if(e) e.stopPropagation();
    
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
    if(e) e.stopPropagation();
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
  
  const extractUrl = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : null;
  };

  // Safe Unique Groups Extraction
  const uniqueGroups = Array.from(new Set(globalTasks.filter(t => t.sender).map(t => t.sender))).sort();

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
    if (uniqueGroups.includes(filter) && t.sender !== filter) return false; // Basic support for Group filtering
    
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

  // 4. DISPLAY-ONLY Deduplication Helper (PRESERVED EXACTLY AS BEFORE)
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
      const msgKey = normMsg ? `msg_${sender}_${normMsg}_${deadlineTime}` : null;
      
      const normTitle = t.task ? getNormalizedString(t.task) : '';
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

  const renderTaskCard = (task) => {
      const url = extractUrl(task.originalMessage);
      const isCompleted = task.status === 'COMPLETED';
      const isOverdue = !isCompleted && getTaskCategory(task) === 'OVERDUE';
      const isHighPriority = task.priority === 'HIGH';
      
      // Calculate identical dupes just for UI context, NOT mutating db object
      const duplicatesCount = globalTasks.filter(t => t.task === task.task && t.sender === task.sender && t.deadline === task.deadline).length;

      return (
        <div className={`task-item ${isCompleted ? 'task-item-completed' : ''}`} key={task.id}>
            <div className="task-checkbox-container">
               <button 
                  className={`task-checkbox-btn ${isCompleted ? 'completed' : ''}`} 
                  onClick={(e) => handleStatusChange(e, task.id, isCompleted ? 'PENDING' : 'COMPLETED')}
                  title={isCompleted ? "Mark pending" : "Mark complete"}
               >
                  {isCompleted ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle></svg>
                  )}
               </button>
            </div>
            
            <div className="task-content">
                <div className="task-title-row">
                    <span className="task-title" onClick={() => setSelectedTask(task)}>{task.task || 'Unnamed Task'}</span>
                    <div className="task-meta-badges">
                        {isHighPriority && !isCompleted && (
                            <span className="badge-priority">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                High
                            </span>
                        )}
                        {isOverdue && <span className="badge-overdue">Overdue</span>}
                    </div>
                </div>
                
                <div className="task-subtitle-row">
                    <span className="badge-source">{task.sender}</span>
                    <span style={{opacity: 0.5}}>·</span>
                    <span>{task.category || 'Inbox'}</span>
                    {duplicatesCount > 1 && (
                        <>
                           <span style={{opacity: 0.5}}>·</span>
                           <span>Reported in {duplicatesCount} messages</span>
                        </>
                    )}
                </div>
                
                {task.originalMessage && (
                    <div className="task-original-msg">
                        "{task.originalMessage}"
                    </div>
                )}
            </div>
            
            <div className="task-actions">
                <span className={`task-deadline ${isOverdue ? 'is-overdue' : ''}`}>
                   {task.deadline ? formatDate(task.deadline) : 'No due date'}
                </span>
                {url && (
                    <a className="btn-link" href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                        Open Link ↗
                    </a>
                )}
                
                <div className="task-more-menu">
                   <button className="btn-more" onClick={(e) => {
                       e.stopPropagation();
                       // Simple native prompt to delete instead of building full custom dropdown UI complexity to save DOM rendering overhead
                       handleDelete(e, task.id);
                   }} title="Delete target">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                   </button>
                </div>
            </div>
        </div>
      );
  };

  const renderSkeleton = () => (
    <div className="task-list-grid">
      {[1, 2, 3, 4, 5].map(i => (
        <div className="skeleton-item" key={i}></div>
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

    // Deduplicate calendar views exactly preserving constraints
    const uniqueCalendarTasks = getUniqueTasks([...globalTasks].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));

    if (calendarView === 'Agenda') {
      const upNext = uniqueCalendarTasks.filter(t => t.deadline && new Date(t.deadline).getTime() >= startOfToday).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      
      return (
        <div className="calendar-view cal-agenda-view">
           <div className="calendar-toolbar" style={{marginBottom: '24px'}}>
              <h2 className="workspace-title">Agenda View</h2>
              <div className="calendar-controls">
                <button className="cal-nav-btn" onClick={() => setCalendarView('Month')}>Month</button>
                <button className="cal-nav-btn" onClick={() => setCalendarView('Agenda')} style={{background: 'var(--border)'}}>Agenda</button>
              </div>
           </div>
           {upNext.length === 0 ? <div className="empty-state">No upcoming tasks with deadlines.</div> : (
              <div className="agenda-list">
                 {upNext.map(t => (
                    <div className="agenda-item" key={t.id}>
                        <div className="agenda-time">
                            {new Date(t.deadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'})}
                        </div>
                        <div className="agenda-content">
                            {t.task}
                            <span style={{color: t.priority === 'HIGH' ? 'var(--status-high)' : t.status === 'COMPLETED' ? 'var(--status-completed)' : 'var(--text-muted)'}}>
                                {t.sender} · {t.status === 'COMPLETED' ? 'Completed' : t.priority === 'HIGH' ? 'High Priority' : 'Pending'} {t.originalMessage ? '· Msg attached' : ''}
                            </span>
                        </div>
                    </div>
                 ))}
              </div>
           )}
        </div>
      );
    }

    // Default Month View Grouping
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
        <div className="calendar-toolbar" style={{marginBottom: '24px'}}>
           <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <h2 className="workspace-title" style={{margin: 0}}>{monthName}</h2>
              <div className="calendar-controls">
                <button className="cal-nav-btn" onClick={() => setCalendarDate(new Date(year, month - 1, 1))}>&lt;</button>
                <button className="cal-today-btn" onClick={() => setCalendarDate(new Date())}>Today</button>
                <button className="cal-nav-btn" onClick={() => setCalendarDate(new Date(year, month + 1, 1))}>&gt;</button>
              </div>
           </div>
           
           <div className="calendar-controls">
                <button className="cal-nav-btn" onClick={() => setCalendarView('Month')} style={{background: 'var(--border)'}}>Month</button>
                <button className="cal-nav-btn" onClick={() => setCalendarView('Agenda')}>Agenda</button>
           </div>
        </div>
        
        <div className="cal-month-grid">
           {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="cal-header-cell">{d}</div>)}
           {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="cal-cell empty"></div>;
              
              const localStr = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
              const dayTasks = tasksByDate[localStr] || [];
              const isToday = day.getTime() === todayMs;
              
              return (
                <div key={localStr} className={`cal-cell ${isToday ? 'is-today' : ''}`}>
                    <div className="cal-date">{day.getDate()}</div>
                    {dayTasks.slice(0, 3).map(t => (
                        <div key={t.id} className={`cal-task-pill ${t.status === 'COMPLETED' ? 'completed' : t.priority === 'HIGH' ? 'high' : getTaskCategory(t) === 'OVERDUE' ? 'overdue' : ''}`}>
                            {t.task}
                        </div>
                    ))}
                    {dayTasks.length > 3 && <div className="cal-task-pill" style={{opacity: 0.5, border: 'none'}}>+{dayTasks.length - 3} more</div>}
                </div>
              );
           })}
        </div>
      </div>
    );
  };

  return (
    <div className="app-layout">
      {/* Global Topbar */}
      <header className="global-topbar">
          <div className="topbar-left">
              <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
              <div className="topbar-logo">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                 WhatsAppTaskManager
                 <span>Workspace</span>
              </div>
          </div>
          
          <div className="search-input-wrapper">
             <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
             <input type="text" className="search-input" placeholder="Search tasks, messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
             <span className="search-hint">⌘ K</span>
          </div>
          
          <div className="topbar-right">
             <div className="account-dropdown-wrapper">
                <button className="account-dropdown-btn" onClick={() => setAccountMenuOpen(!accountMenuOpen)}>
                   <div className="account-avatar">A</div>
                   <span className="account-label">Account</span>
                   <span className="account-chev">▼</span>
                </button>
                {accountMenuOpen && (
                  <>
                    <div className="account-dropdown-overlay" onClick={() => setAccountMenuOpen(false)}></div>
                    <div className="account-dropdown-menu">
                      <div className="account-dropdown-header">
                        <span className="account-dropdown-name">Account Settings</span>
                        <span className="account-dropdown-status">{backendStatus}</span>
                      </div>
                      <button className="account-dropdown-item" onClick={handleLogout}>Log out</button>
                    </div>
                  </>
                )}
             </div>
          </div>
      </header>
      
      <div className="app-body">
          {/* Sidebar */}
          <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
             <div className="sidebar-section">
                <div className="sidebar-nav">
                    <div className={`nav-item ${currentView === 'TASKS' && filter === 'ALL' ? 'active' : ''}`} onClick={() => { setCurrentView('TASKS'); setFilter('ALL'); setSidebarOpen(false); }}>
                       <span className="nav-icon">Inbox</span> Inbox
                    </div>
                    <div className={`nav-item ${currentView === 'TASKS' && filter === 'DUE_TODAY' ? 'active' : ''}`} onClick={() => { setCurrentView('TASKS'); setFilter('DUE_TODAY'); setSidebarOpen(false); }}>
                       <span className="nav-icon">★</span> Today
                    </div>
                    <div className={`nav-item ${currentView === 'CALENDAR' ? 'active' : ''}`} onClick={() => { setCurrentView('CALENDAR'); setSidebarOpen(false); }}>
                       <span className="nav-icon">📅</span> Calendar
                    </div>
                </div>
             </div>
             
             <div className="sidebar-section">
                <div className="sidebar-label">Your Groups</div>
                <div className="sidebar-group-list">
                    {uniqueGroups.length === 0 ? (
                        <div className="group-item" style={{opacity: 0.5}}>No sources detected</div>
                    ) : (
                        uniqueGroups.map(grp => (
                           <div key={grp} className={`nav-item ${filter === grp ? 'active' : ''}`} onClick={() => { setCurrentView('TASKS'); setFilter(grp); setSidebarOpen(false); }}>
                               <div className="group-dot"></div>
                               {grp}
                           </div>
                        ))
                    )}
                </div>
             </div>
             
             <div className="sidebar-footer">
                 <div className={`status-indicator ${backendStatus === 'Connected' ? 'status-online' : 'status-offline'}`}>
                    <div className="status-dot"></div>
                    Backend {backendStatus}
                 </div>
             </div>
          </aside>
          
          {/* Main Workspace */}
          <main className="main-workspace">
             <header className="workspace-header">
                 <div className="workspace-title-row">
                    <div>
                        <h1 className="workspace-title">{currentView === 'TASKS' ? (filter === 'ALL' ? 'Inbox' : filter) : 'Calendar'}</h1>
                        <p className="workspace-subtitle">Manage your WhatsApp-captured tasks</p>
                    </div>
                 </div>
                 
                 {currentView === 'TASKS' && (
                     <div className="toolbar">
                        <div className="filter-btn-group">
                           {['ALL', 'PENDING', 'COMPLETED', 'HIGH', 'OVERDUE'].map(f => (
                              <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                                 {f === 'HIGH' ? 'High Priority' : f === 'ALL' ? 'All Tasks' : f.charAt(0) + f.slice(1).toLowerCase()}
                              </button>
                           ))}
                        </div>
                        <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                           <option value="recent">Sort by: Recent</option>
                           <option value="deadline">Sort by: Deadline</option>
                           <option value="priority">Sort by: Priority</option>
                        </select>
                     </div>
                 )}
             </header>
             
             <div className="content-area">
                 {currentView === 'TASKS' ? (
                    <>
                       {loading && renderSkeleton()}
                       {error && (
                         <div className="empty-state">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            Connection Error<br/>
                            <span style={{opacity: 0.7}}>Check your backend connection</span>
                         </div>
                       )}
                       
                       {!loading && !error && fullyProcessedTasks.length === 0 && (
                          <div className="empty-state">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                              You're all caught up.<br />
                              <span style={{opacity: 0.7}}>No pending issues found for this filter.</span>
                          </div>
                       )}
                       
                       {!loading && !error && fullyProcessedTasks.length > 0 && (
                          <>
                             {sections.OVERDUE.length > 0 || !isFiltering ? (
                                <div className="task-section">
                                  <div className="section-label">Overdue</div>
                                  <div className="task-list-grid">{sections.OVERDUE.map(renderTaskCard)}</div>
                                </div>
                             ) : null}
                             
                             {sections.TODAY.length > 0 || !isFiltering ? (
                                <div className="task-section">
                                  <div className="section-label">Today</div>
                                  <div className="task-list-grid">{sections.TODAY.map(renderTaskCard)}</div>
                                </div>
                             ) : null}
                             
                             {(sections.UPCOMING.TOMORROW.length > 0 || sections.UPCOMING.THIS_WEEK.length > 0 || sections.UPCOMING.LATER.length > 0) || !isFiltering ? (
                                <div className="task-section">
                                  <div className="section-label">Upcoming</div>
                                  <div className="task-list-grid">
                                     {sections.UPCOMING.TOMORROW.length > 0 && <div className="sub-label">Tomorrow</div>}
                                     {sections.UPCOMING.TOMORROW.map(renderTaskCard)}
                                     
                                     {sections.UPCOMING.THIS_WEEK.length > 0 && <div className="sub-label">This Week</div>}
                                     {sections.UPCOMING.THIS_WEEK.map(renderTaskCard)}
                                     
                                     {sections.UPCOMING.LATER.length > 0 && <div className="sub-label">Later</div>}
                                     {sections.UPCOMING.LATER.map(renderTaskCard)}
                                  </div>
                                </div>
                             ) : null}
                             
                             {sections.NO_DEADLINE.length > 0 && (
                                <div className="task-section">
                                  <div className="section-label">No Deadline</div>
                                  <div className="task-list-grid">{sections.NO_DEADLINE.map(renderTaskCard)}</div>
                                </div>
                             )}
                          </>
                       )}
                    </>
                 ) : (
                    renderCalendar()
                 )}
             </div>
          </main>
          
          {/* Right Rail Context */}
          <aside className="right-rail">
             <div className="rail-section">
                 <h3 className="rail-title">Quick Metrics</h3>
                 <div className="quick-metrics">
                     <div className="metric-row">Total Tasks <span>{globalTasks.length}</span></div>
                     <div className="metric-row">Pending <span>{globalTasks.filter(t => t.status !== 'COMPLETED').length}</span></div>
                     <div className="metric-row" style={{color: 'var(--status-completed)'}}>Completed <span style={{background: 'var(--status-completed-bg)'}}>{globalTasks.filter(t => t.status === 'COMPLETED').length}</span></div>
                     <div className="metric-row" style={{color: 'var(--status-overdue)'}}>Overdue <span style={{background: 'var(--status-overdue-bg)'}}>{globalTasks.filter(t => t.status !== 'COMPLETED' && t.deadline && new Date(t.deadline).getTime() < startOfToday).length}</span></div>
                     <div className="metric-row" style={{color: 'var(--status-high)'}}>High Priority <span style={{background: 'var(--status-high-bg)'}}>{globalTasks.filter(t => t.status === 'PENDING' && t.priority === 'HIGH').length}</span></div>
                 </div>
             </div>
             
             <div className="rail-section">
                 <h3 className="rail-title">Today's Agenda</h3>
                 {sections.TODAY.length === 0 ? (
                     <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>No events today.</div>
                 ) : (
                     <div className="agenda-list">
                         {sections.TODAY.map(t => (
                             <div className="agenda-item" key={`agenda-${t.id}`}>
                                 <div className="agenda-time">
                                     {t.deadline ? new Date(t.deadline).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                 </div>
                                 <div className="agenda-content">
                                     {t.task}
                                     <span>{t.sender}</span>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
          </aside>
      </div>

      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
