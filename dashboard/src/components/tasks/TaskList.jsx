import React, { useMemo } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { useAppState } from '../../hooks/useAppState';
import { getTaskCategory, getUniqueTasks } from '../../utils/taskUtils';
import TaskRow from './TaskRow';

export default function TaskList() {
  const { globalTasks, isLoading, isError } = useTasks();
  const { filter, sortBy, searchQuery, setFilter, setSortBy } = useAppState();

  const fullyProcessedTasks = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    // 1. Text Search & State Filters
    let processed = globalTasks.filter(t => {
      if (query) {
        const match = (t.task && t.task.toLowerCase().includes(query)) ||
          (t.originalMessage && t.originalMessage.toLowerCase().includes(query)) ||
          (t.sender && t.sender.toLowerCase().includes(query)) ||
          (t.category && t.category.toLowerCase().includes(query));
        if (!match) return false;
      }
      if (filter === 'PENDING' && (t.status === 'COMPLETED' || getTaskCategory(t) === 'OVERDUE')) return false;
      if (filter === 'COMPLETED' && t.status !== 'COMPLETED') return false;
      if (filter === 'HIGH' && t.priority !== 'HIGH') return false;
      if (filter === 'DUE_TODAY' && getTaskCategory(t) !== 'TODAY') return false;
      if (filter === 'OVERDUE' && (t.status === 'COMPLETED' || getTaskCategory(t) !== 'OVERDUE')) return false;
      
      const groupKeys = new Set(globalTasks.map(gt => gt.senderKey || (gt.sender || '').trim().replace(/\s*\(\d+\s*messages?\)/gi, '').toLowerCase().trim()));
      
      if (groupKeys.has(filter)) {
          const tKey = t.senderKey || (t.sender || '').trim().replace(/\s*\(\d+\s*messages?\)/gi, '').toLowerCase().trim();
          if (tKey !== filter) return false;
      }
      
      return true;
    });

    // 2. Sort
    processed.sort((a, b) => {
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
         return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    // 3. Deduplicate exactly like before
    return getUniqueTasks(processed);
  }, [globalTasks, filter, sortBy, searchQuery]);

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

  const renderSkeleton = () => (
    <div className="task-list-grid">
      {[1, 2, 3, 4, 5].map(i => <div className="skeleton-item" key={i}></div>)}
    </div>
  );

  return (
    <>
      <header className="workspace-header">
         <div className="workspace-title-row">
            <div>
                <h1 className="workspace-title">{filter === 'ALL' ? 'Inbox' : filter}</h1>
                <p className="workspace-subtitle">Manage your WhatsApp-captured tasks</p>
            </div>
         </div>
         
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
      </header>

      <div className="content-area">
          {isLoading && renderSkeleton()}
          {isError && (
             <div className="empty-state">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                Connection Error<br/>
                <span style={{opacity: 0.7}}>Check your backend connection</span>
             </div>
          )}
          
          {!isLoading && !isError && fullyProcessedTasks.length === 0 && (
              <div className="empty-state">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                  You're all caught up.<br />
                  <span style={{opacity: 0.7}}>No pending issues found for this filter.</span>
              </div>
          )}

          {!isLoading && !isError && fullyProcessedTasks.length > 0 && (
              <>
                 {sections.OVERDUE.length > 0 || !isFiltering ? (
                    <div className="task-section">
                      <div className="section-label">Overdue</div>
                      <div className="task-list-grid">{sections.OVERDUE.map(t => <TaskRow key={t.id} task={t} />)}</div>
                    </div>
                 ) : null}
                 
                 {sections.TODAY.length > 0 || !isFiltering ? (
                    <div className="task-section">
                      <div className="section-label">Today</div>
                      <div className="task-list-grid">{sections.TODAY.map(t => <TaskRow key={t.id} task={t} />)}</div>
                    </div>
                 ) : null}
                 
                 {sections.UPCOMING.TOMORROW.length > 0 || sections.UPCOMING.THIS_WEEK.length > 0 || sections.UPCOMING.LATER.length > 0 || !isFiltering ? (
                    <div className="task-section">
                      <div className="section-label">Upcoming</div>
                      <div className="task-list-grid">
                         {sections.UPCOMING.TOMORROW.length > 0 && <div className="sub-label">Tomorrow</div>}
                         {sections.UPCOMING.TOMORROW.map(t => <TaskRow key={t.id} task={t} />)}
                         
                         {sections.UPCOMING.THIS_WEEK.length > 0 && <div className="sub-label">This Week</div>}
                         {sections.UPCOMING.THIS_WEEK.map(t => <TaskRow key={t.id} task={t} />)}
                         
                         {sections.UPCOMING.LATER.length > 0 && <div className="sub-label">Later</div>}
                         {sections.UPCOMING.LATER.map(t => <TaskRow key={t.id} task={t} />)}
                      </div>
                    </div>
                 ) : null}
                 
                 {sections.NO_DEADLINE.length > 0 && (
                    <div className="task-section">
                      <div className="section-label">No Deadline</div>
                      <div className="task-list-grid">{sections.NO_DEADLINE.map(t => <TaskRow key={t.id} task={t} />)}</div>
                    </div>
                 )}
              </>
          )}
      </div>
    </>
  );
}
