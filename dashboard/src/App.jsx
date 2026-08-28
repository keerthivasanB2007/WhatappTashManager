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
    <div className="task-card" key={task.id}>
      <div className="task-header">
        <h2>{task.task || 'Unnamed Task'}</h2>
        <span className={`badge ${task.status.toLowerCase()}`}>[{task.status}]</span>
      </div>
      <p className="original-message">"{task.originalMessage}"</p>
      <p className="sender">From: {task.sender}</p>
      
      <div className="task-meta">
        <span className={`priority-badge ${task.priority?.toLowerCase() || 'low'}`}>
          {task.priority === 'HIGH' ? '🔴' : task.priority === 'MEDIUM' ? '🟡' : '⚪'} {task.priority || 'LOW'}
        </span>
        {task.category && <span className="category-badge">📚 {task.category}</span>}
        <span className="deadline-badge">📅 Due: {formatDate(task.deadline)}</span>
        {task.receivedAt && <span className="received-badge">⏰ Received: {formatDate(task.receivedAt)}</span>}
        {task.createdAt && <span className="received-badge">📝 Created: {formatDate(task.createdAt)}</span>}
      </div>

      <div className="task-actions">
        {task.status === 'PENDING' ? (
          <button className="complete-btn" onClick={() => handleStatusChange(task.id, 'COMPLETED')}>✓ Complete</button>
        ) : (
          <button className="pending-btn" style={{'--btn-bg': '#f59e0b'}} onClick={() => handleStatusChange(task.id, 'PENDING')}>↩ Mark Pending</button>
        )}
        <button className="delete-btn" onClick={() => handleDelete(task.id)}>Delete</button>
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
    <div className="dashboard-container">
      <header className="header">
        <h1>WhatsApp Task Manager</h1>
        <button onClick={handleLogout} style={{position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: '1px solid #fff', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>Logout</button>
        <div className="summary-cards">
          <div className="card">TOTAL<br/><span className="card-val">{totalTasks}</span></div>
          <div className="card">PENDING<br/><span className="card-val">{pendingTasks}</span></div>
          <div className="card">COMPLETED<br/><span className="card-val">{completedTasks}</span></div>
          <div className="card overdue-card">OVERDUE<br/><span className="card-val">{overdueTasks}</span></div>
          <div className="card" style={{borderColor: '#ef4444'}}>HIGH P.<br/><span className="card-val" style={{color: '#ef4444'}}>{highPriorityTasks}</span></div>
        </div>
        {reminders.length > 0 && (
          <div className="reminders-banner">
            <span className="reminders-title">⏰ Upcoming Reminders: {reminders.length}</span>
            <ul className="reminders-list">
              {reminders.map(r => (
                <li key={r.taskId}>
                  <strong>{r.title}</strong> — Due: {formatDate(r.deadline)} (Priority: {r.priority})
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <div className="controls">
        <div className="search-bar">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search tasks, messages, senders, or categories..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filters">
          {['ALL', 'PENDING', 'COMPLETED', 'HIGH'].map(f => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f === 'HIGH' ? 'High Priority' : f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <main className="task-list">
        {loading && <p className="loading">Loading tasks...</p>}
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={fetchTasks}>Retry</button>
          </div>
        )}
        
        {!loading && !error && searchedTasks.length === 0 && (
          <p className="empty-state">
            {searchQuery ? 'No tasks match your search.' : filter === 'PENDING' ? 'No pending tasks.' : filter === 'COMPLETED' ? 'No completed tasks.' : 'No tasks yet.'}
          </p>
        )}

        {!loading && !error && (
          <>
            {sections.OVERDUE.length > 0 && (
              <section className="task-section">
                <h3 className="section-title overdue">OVERDUE</h3>
                {sections.OVERDUE.map(renderTaskCard)}
              </section>
            )}
            {sections.TODAY.length > 0 && (
              <section className="task-section">
                <h3 className="section-title today">TODAY</h3>
                {sections.TODAY.map(renderTaskCard)}
              </section>
            )}
            {sections.TOMORROW.length > 0 && (
              <section className="task-section">
                <h3 className="section-title tomorrow">TOMORROW</h3>
                {sections.TOMORROW.map(renderTaskCard)}
              </section>
            )}
            {sections.UPCOMING.length > 0 && (
              <section className="task-section">
                <h3 className="section-title upcoming">UPCOMING</h3>
                {sections.UPCOMING.map(renderTaskCard)}
              </section>
            )}
            {sections.COMPLETED.length > 0 && (
              <section className="task-section">
                <h3 className="section-title completed">COMPLETED</h3>
                {sections.COMPLETED.map(renderTaskCard)}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
