import React, { useMemo, useState, useEffect } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { useAppState } from '../../hooks/useAppState';
import { getTaskCategory, getUniqueTasks } from '../../utils/taskUtils';
import TaskRow from './TaskRow';

function getInitials(name) {
    if (!name) return '?';
    const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return name.charAt(0).toUpperCase();
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

export default function TaskList() {
  const { globalTasks, isLoading, isError, updateStatus, deleteTask } = useTasks();
  const { filter, sortBy, searchQuery, setFilter, setSortBy, selectedTaskId, setSelectedTaskId } = useAppState();

  const [selectedForBulk, setSelectedForBulk] = useState(new Set());
  const [senderFilter, setSenderFilter] = useState('');

  // Clear bulk selection on view change
  useEffect(() => setSelectedForBulk(new Set()), [filter, searchQuery]);

  const groupMap = useMemo(() => {
      const map = new Map();
      const sortedTasks = [...globalTasks].sort((a,b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      sortedTasks.forEach(t => {
          const key = t.senderKey || (t.sender || '').trim().replace(/\s*\(\d+\s*messages?\)/gi, '').toLowerCase().trim();
          if (key && !map.has(key)) map.set(key, t.sender);
      });
      return map;
  }, [globalTasks]);

  const deduplicatedTasks = useMemo(() => getUniqueTasks(globalTasks), [globalTasks]);

  const fullyProcessedTasks = useMemo(() => {
    let processed = deduplicatedTasks.filter(t => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const match = (t.task && t.task.toLowerCase().includes(query)) ||
          (t.originalMessage && t.originalMessage.toLowerCase().includes(query)) ||
          (t.sender && t.sender.toLowerCase().includes(query));
        if (!match) return false;
      }
      if (filter === 'PENDING') return t.status !== 'COMPLETED';
      if (filter === 'COMPLETED') return t.status === 'COMPLETED';
      if (filter === 'HIGH_PRIORITY') return t.status !== 'COMPLETED' && t.priority === 'HIGH';
      if (filter === 'TODAY' || filter === 'DUE_TODAY') return t.status !== 'COMPLETED' && (getTaskCategory(t) === 'TODAY' || getTaskCategory(t) === 'OVERDUE');
      if (filter === 'OVERDUE') return t.status !== 'COMPLETED' && getTaskCategory(t) === 'OVERDUE';
      if (filter === 'UPCOMING') return t.status !== 'COMPLETED' && ['TOMORROW', 'THIS_WEEK', 'LATER'].includes(getTaskCategory(t));
      
      const tKey = t.senderKey || (t.sender || '').trim().replace(/\s*\(\d+\s*messages?\)/gi, '').toLowerCase().trim();
      if (groupMap.has(filter) && tKey !== filter && filter !== 'ALL' && filter !== 'SENDERS') return false;
      
      return true;
    });

    processed.sort((a, b) => {
      if (sortBy === 'deadline') {
         if (!a.deadline && !b.deadline) return 0;
         if (!a.deadline) return 1;
         if (!b.deadline) return -1;
         return new Date(a.deadline) - new Date(b.deadline);
      } else if (sortBy === 'priority') {
         const p = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
         const diff = (p[b.priority] || 1) - (p[a.priority] || 1);
         return diff !== 0 ? diff : new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (sortBy === 'oldest') {
         return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      } else {
         return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); // recent
      }
    });

    return processed;
  }, [deduplicatedTasks, filter, sortBy, searchQuery, groupMap]);

  const handleBulkComplete = async () => {
      for (const id of selectedForBulk) await updateStatus({ id, status: 'COMPLETED' });
      setSelectedForBulk(new Set());
  };

  const handleBulkDelete = async () => {
      if (window.confirm(`Delete ${selectedForBulk.size} tasks? This can't be undone.`)) {
          for (const id of selectedForBulk) await deleteTask(id);
          setSelectedForBulk(new Set());
      }
  };

  const toggleBulkSelect = (id, e) => {
      e?.stopPropagation();
      const next = new Set(selectedForBulk);
      if (next.has(id)) next.delete(id); else next.add(id);
      setSelectedForBulk(next);
  };

  const renderTaskRows = (tasks, contextOverrides = {}) => {
      return tasks.map(t => {
          const isSelectedForBulk = selectedForBulk.has(t.id);
          // In overdue view/section, checkbox handles selection for triage
          const isOverdueTriage = (filter === 'OVERDUE' || filter === 'TODAY') && getTaskCategory(t) === 'OVERDUE';
          
         return (
             <div key={t.id} style={{ display: 'flex', alignItems: 'center' }} className="task-row-wrapper">
                 <div style={{ flex: 1, minWidth: 0 }}>
                     <TaskRow 
                         task={t} 
                         isSelected={selectedTaskId === t.id} 
                         onSelect={setSelectedTaskId} 
                     />
                 </div>
             </div>
          );
      });
  };

  if (filter === 'SENDERS') {
      let senders = Array.from(groupMap.keys());
      if (senderFilter) {
          const q = senderFilter.toLowerCase();
          senders = senders.filter(k => (groupMap.get(k) || '').toLowerCase().includes(q));
      }
      senders.sort((a,b) => {
          const countA = deduplicatedTasks.filter(t => t.status !== 'COMPLETED' && (t.senderKey || t.sender.toLowerCase()) === a).length;
          const countB = deduplicatedTasks.filter(t => t.status !== 'COMPLETED' && (t.senderKey || t.sender.toLowerCase()) === b).length;
          return countB - countA;
      });

      return (
        <main className="main-workspace task-list-workspace">
           <header className="workspace-header">
              <h1 className="workspace-title">Sender Groups</h1>
              <p className="workspace-subtitle">Filter tasks by origin group</p>
              <div className="toolbar" style={{ marginTop: '16px' }}>
                  <input type="text" className="sidebar-search-input" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)' }} placeholder="Filter senders..." value={senderFilter} onChange={e => setSenderFilter(e.target.value)} />
              </div>
           </header>
           <div className="content-area" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {senders.map(grp => {
                  const display = groupMap.get(grp);
                  const count = deduplicatedTasks.filter(t => t.status !== 'COMPLETED' && (t.senderKey || t.sender.toLowerCase()) === grp).length;
                  return (
                      <div key={grp} className="sender-card" onClick={() => setFilter(grp)}>
                          <div className="sender-avatar" style={{width: 32, height: 32, fontSize: '1rem', background: 'var(--border)'}}>{getInitials(display)}</div>
                          <div className="sender-card-info">
                              <div className="sender-card-name">{display}</div>
                              <div className="sender-card-count">{count} active tasks</div>
                          </div>
                      </div>
                  );
              })}
           </div>
        </main>
      );
  }

  const sections = {
    OVERDUE: fullyProcessedTasks.filter(t => t.status !== 'COMPLETED' && getTaskCategory(t) === 'OVERDUE'),
    TODAY: fullyProcessedTasks.filter(t => getTaskCategory(t) === 'TODAY'),
    ALL_OTHER: fullyProcessedTasks.filter(t => getTaskCategory(t) !== 'TODAY' && getTaskCategory(t) !== 'OVERDUE')
  };

  const getTitle = () => {
     if (filter === 'ALL') return 'All Tasks';
     if (filter === 'TODAY') return 'Today';
     if (filter === 'OVERDUE') return 'Overdue';
     if (filter === 'UPCOMING') return 'Upcoming';
     if (filter === 'HIGH_PRIORITY') return 'High Priority';
     if (filter === 'COMPLETED') return 'Completed';
     if (groupMap.has(filter)) return groupMap.get(filter);
     return 'Inbox';
  };

  return (
   <main className="main-workspace task-list-workspace">
      <header className="workspace-header">
         <div className="greeting-panel">
            <div className="greeting-text">
              <div className="greeting-icon-bg">
                 <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .16 5.333.158 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.332 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              </div>
              <div>
                <h1 className="greeting-title">Good Evening, Keerthivasan! <span role="img" aria-label="wave">👋</span></h1>
                <p className="greeting-subtitle">Here are your WhatsApp-captured tasks</p>
              </div>
            </div>
            
            <div className="greeting-metrics">
               <div className="g-metric g-blue">
                  <div className="g-icon">📄</div>
                  <div className="g-data"><span>Total</span><strong>{globalTasks.length}</strong></div>
               </div>
               <div className="g-metric g-yellow">
                  <div className="g-icon">🕒</div>
                  <div className="g-data"><span>Pending</span><strong>{globalTasks.filter(t=>t.status!=='COMPLETED').length}</strong></div>
               </div>
               <div className="g-metric g-green">
                  <div className="g-icon">✅</div>
                  <div className="g-data"><span>Completed</span><strong>{globalTasks.filter(t=>t.status==='COMPLETED').length}</strong></div>
               </div>
               <div className="g-metric g-orange">
                  <div className="g-icon">🔥</div>
                  <div className="g-data"><span>High Priority</span><strong>{globalTasks.filter(t=>t.status!=='COMPLETED'&&t.priority==='HIGH').length}</strong></div>
               </div>
            </div>
         </div>
         
         <div className="toolbar">
            <div className="filter-btn-group">
               <button className={`filter-btn ${filter === 'ALL' ? 'active filter-blue' : ''}`} onClick={() => setFilter('ALL')}>
                  <span className="btn-icon">🗂️</span> All Tasks
               </button>
               <button className={`filter-btn ${filter === 'PENDING' ? 'active filter-blue' : ''}`} onClick={() => setFilter('PENDING')}>
                  <span className="btn-icon">🕒</span> Pending
               </button>
               <button className={`filter-btn ${filter === 'COMPLETED' ? 'active filter-blue' : ''}`} onClick={() => setFilter('COMPLETED')}>
                  <span className="btn-icon">✅</span> Completed
               </button>
               <button className={`filter-btn ${filter === 'HIGH_PRIORITY' ? 'active filter-orange' : ''}`} onClick={() => setFilter('HIGH_PRIORITY')}>
                  <span className="btn-icon">🔥</span> High Priority
               </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {selectedForBulk.size > 0 ? (
                    <div className="bulk-action-bar">
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedForBulk.size} selected</span>
                        <button className="btn-link" onClick={handleBulkComplete}>Mark Complete</button>
                        <button className="btn-link" style={{ color: 'var(--status-overdue)' }} onClick={handleBulkDelete}>Delete</button>
                        <button className="btn-link" style={{ color: 'var(--text-muted)' }} onClick={() => setSelectedForBulk(new Set())}>Clear</button>
                    </div>
                ) : (
                    <div className="sort-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                           <option value="deadline">Sort: Deadline ▼</option>
                           <option value="priority">Sort: Priority</option>
                           <option value="recent">Sort: Recent</option>
                           <option value="oldest">Sort: Oldest</option>
                        </select>
                        <label style={{ fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                            <input type="checkbox" checked={selectedForBulk.size === fullyProcessedTasks.length && fullyProcessedTasks.length > 0} onChange={(e) => {
                                if (e.target.checked) setSelectedForBulk(new Set(fullyProcessedTasks.map(t => t.id)));
                                else setSelectedForBulk(new Set());
                            }} style={{ margin: 0 }} /> Select all
                        </label>
                    </div>
                )}
            </div>
         </div>
      </header>

      <div className="content-area" style={{ paddingLeft: 0, paddingRight: 0 }}>
          {isLoading && <div style={{padding: 32}}>Loading...</div>}
          
          {!isLoading && fullyProcessedTasks.length === 0 && (
              <div className="empty-state-large" style={{ padding: 64, textAlign: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)', marginBottom: 16 }}><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path></svg>
                  <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {filter === 'OVERDUE' ? "Nothing overdue — you're on top of it." : (filter === 'TODAY' ? "You're all caught up today." : "No tasks found.")}
                  </div>
              </div>
          )}

          {!isLoading && fullyProcessedTasks.length > 0 && (
              <div className="task-list-container">
                  {(filter === 'TODAY' || filter === 'OVERDUE') && sections.OVERDUE.length > 0 && (
                      <div className="task-section">
                          <div className="section-label" style={{ padding: '0 32px', marginBottom: '8px' }}>
                              <span style={{ color: 'var(--status-overdue)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: '700' }}>
                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                 OVERDUE ({sections.OVERDUE.length})
                              </span>
                          </div>
                          <div className="task-list-grid">{renderTaskRows(sections.OVERDUE)}</div>
                      </div>
                  )}

                  {filter === 'TODAY' && sections.TODAY.length > 0 && (
                      <div className="task-section" style={{ marginTop: sections.OVERDUE.length > 0 ? 32 : 0 }}>
                          <div className="section-label" style={{ padding: '0 32px' }}>📅 DUE TODAY ({sections.TODAY.length})</div>
                          <div className="task-list-grid">{renderTaskRows(sections.TODAY)}</div>
                      </div>
                  )}
                  {filter === 'TODAY' && sections.TODAY.length === 0 && sections.OVERDUE.length > 0 && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0 32px', marginTop: 32 }}>Nothing due today.</div>
                  )}

                  {/* Standard view rendering for non-Today specific layouts */}
                  {filter !== 'TODAY' && filter !== 'OVERDUE' && (
                      <div className="task-list-grid">{renderTaskRows(fullyProcessedTasks)}</div>
                  )}
              </div>
          )}
      </div>
   </main>
  );
}
