import React, { useState, useMemo } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useTasks } from '../../hooks/useTasks';
import { getUniqueTasks } from '../../utils/taskUtils';

function getInitials(name) {
    if (!name) return '?';
    const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return name.charAt(0).toUpperCase();
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

export default function Sidebar() {
  const { currentView, setCurrentView, filter, setFilter, sidebarOpen, setSidebarOpen, backendStatus } = useAppState();
  const { globalTasks } = useTasks();
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [senderSearchQuery, setSenderSearchQuery] = useState('');

  // 4.4 DISPLAY NAME SELECTION: exactly matches existing chronological behavior.
  const groupMap = useMemo(() => {
      const map = new Map();
      const sortedTasks = [...globalTasks].sort((a,b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      sortedTasks.forEach(t => {
          const key = t.senderKey || (t.sender || '').trim().replace(/\s*\(\d+\s*messages?\)/gi, '').toLowerCase().trim();
          if (key && !map.has(key)) {
              map.set(key, t.sender);
          }
      });
      return map;
  }, [globalTasks]);

  // 1 & 2: SIDEBAR COUNTS VS GLOBAL SEARCH & COMPLETED TASKS
  // Sidebar counts rely purely on deduplicated active tasks globally, completely agnostic to `searchQuery`.
  const deduplicatedNonCompletedTasks = useMemo(() => {
      return getUniqueTasks(globalTasks.filter(t => t.status !== 'COMPLETED'));
  }, [globalTasks]);

  // Case-insensitive sender search filtering explicitly filtering the VISIBLE groups natively independent of global task visibility
  const uniqueGroups = useMemo(() => {
      let groups = Array.from(groupMap.keys()).sort();
      if (senderSearchQuery.trim()) {
         const q = senderSearchQuery.trim().toLowerCase();
         groups = groups.filter(k => (groupMap.get(k) || '').toLowerCase().includes(q));
      }
      return groups;
  }, [groupMap, senderSearchQuery]);

  const displayedGroups = showAllGroups || senderSearchQuery ? uniqueGroups : uniqueGroups.slice(0, 8);
  const remainingGroups = uniqueGroups.length > 8 && !senderSearchQuery;

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-section">
        <div className="sidebar-label">WORKSPACE</div>
        <div className="sidebar-nav">
            <button className={`nav-item ${currentView === 'TASKS' && filter === 'ALL' ? 'active' : ''}`} onClick={() => { setCurrentView('TASKS'); setFilter('ALL'); setSidebarOpen(false); }}>
               <span className="nav-icon">📅</span> All Tasks
            </button>
            <button className={`nav-item ${currentView === 'TASKS' && filter === 'DUE_TODAY' ? 'active' : ''}`} onClick={() => { setCurrentView('TASKS'); setFilter('DUE_TODAY'); setSidebarOpen(false); }}>
               <span className="nav-icon">⭐</span> Today
            </button>
            <button className={`nav-item ${currentView === 'CALENDAR' ? 'active' : ''}`} onClick={() => { setCurrentView('CALENDAR'); setSidebarOpen(false); }}>
               <span className="nav-icon">🗓️</span> Calendar
            </button>
        </div>
      </div>
      
      <div className="sidebar-section" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-label">SENDERS</div>
        
        <div className="sidebar-search-wrapper">
           <input 
              type="search" 
              className="sidebar-search-input" 
              placeholder="Filter senders..." 
              value={senderSearchQuery}
              onChange={e => setSenderSearchQuery(e.target.value)}
              aria-label="Filter senders"
           />
        </div>

        <div className="sidebar-group-list">
            {uniqueGroups.length === 0 ? (
                <div className="empty-state-compact">
                  {senderSearchQuery ? 'No matching senders' : 'No conversations'}
                </div>
            ) : (
                <>
                  {displayedGroups.map(grpKey => {
                    const displaySender = groupMap.get(grpKey);
                    
                    const taskCount = deduplicatedNonCompletedTasks.filter(t => {
                        const tKey = t.senderKey || (t.sender || '').trim().replace(/\s*\(\d+\s*messages?\)/gi, '').toLowerCase().trim();
                        return tKey === grpKey;
                    }).length;

                    return (
                     <button key={grpKey} className={`nav-item nav-item-sender ${filter === grpKey ? 'active' : ''}`} onClick={() => { setCurrentView('TASKS'); setFilter(grpKey); setSidebarOpen(false); }}>
                         <div className="sender-avatar">{getInitials(displaySender)}</div>
                         <div className="sender-name">
                             {displaySender}
                         </div>
                         {taskCount > 0 && <span className="sender-count">{taskCount}</span>}
                     </button>
                  )})}
                  
                  {remainingGroups && !showAllGroups && (
                      <button className="nav-item show-more-btn" onClick={() => setShowAllGroups(true)}>
                          Show {uniqueGroups.length - 8} more...
                      </button>
                  )}
                  {showAllGroups && !senderSearchQuery && (
                      <button className="nav-item show-more-btn" onClick={() => setShowAllGroups(false)}>
                          Show less
                      </button>
                  )}
                </>
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
  );
}
