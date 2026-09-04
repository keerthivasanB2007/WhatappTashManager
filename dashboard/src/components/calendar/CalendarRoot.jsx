import React, { useState, useEffect } from 'react';
import { useFloating, offset, flip, shift, autoUpdate, useInteractions, useHover, useFocus, useRole, useDismiss, FloatingPortal } from '@floating-ui/react';
import { useTasks } from '../../hooks/useTasks';
import { useAppState } from '../../hooks/useAppState';
import { getTaskCategory, getUniqueTasks } from '../../utils/taskUtils';

// Helper component for the "+N More" popover using Floating UI natively correctly constraining DOM explosions!
function MoreTasksPopover({ tasks }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-start',
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className="cal-task-pill cal-more-btn"
        aria-label={`View ${tasks.length} more tasks`}
      >
        +{tasks.length} more
      </button>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className="cal-more-popover"
            style={{ ...floatingStyles, zIndex: 'var(--z-dropdown)' }}
            {...getFloatingProps()}
          >
            <div className="cal-more-header">Overflow Tasks ({tasks.length})</div>
            <div className="cal-more-tasklist">
              {tasks.map(t => (
                 <div key={t.id} className={`cal-task-pill ${t.status === 'COMPLETED' ? 'completed' : t.priority === 'HIGH' ? 'high' : getTaskCategory(t) === 'OVERDUE' ? 'overdue' : ''}`} title={t.task}>
                     {t.task}
                 </div>
              ))}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export default function CalendarRoot() {
  const { globalTasks } = useTasks();
  const { calendarDate, setCalendarDate, calendarView, setCalendarView, filter } = useAppState();

  // Mobile Default Trigger - Safely evaluates execution bounds minimizing lifecycle re-renders explicitly. 
  useEffect(() => {
     if (typeof window === 'undefined') return;
     const mql = window.matchMedia('(max-width: 768px)');
     
     // Initialize natively based upon explicitly bound current context
     if (mql.matches) {
         setCalendarView('Agenda');
     }
     
     const handleMediaChange = (e) => {
         if (e.matches) {
             setCalendarView('Agenda'); // Default for mobile
         } else {
             setCalendarView('Month'); // Default for desktop layout
         }
     };
     
     if (mql.addEventListener) {
         mql.addEventListener('change', handleMediaChange);
     } else {
         mql.addListener(handleMediaChange); // Legacy safari fallback
     }
     
     return () => {
         if (mql.removeEventListener) {
             mql.removeEventListener('change', handleMediaChange);
         } else {
             mql.removeListener(handleMediaChange);
         }
     };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Process Calendar deduplication implicitly preserving SenderKey constraints natively protecting universal contexts!
  const uniqueCalendarTasks = getUniqueTasks([...globalTasks].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)))
    .filter(t => {
        // Enforce sender filter dynamically preventing cross-contamination exclusively if not using generic state bounds
        const groupKeys = new Set(globalTasks.map(gt => gt.senderKey || (gt.sender || '').trim().replace(/\s*\(\d+\s*messages?\)/gi, '').toLowerCase().trim()));
        if (groupKeys.has(filter)) {
            const tKey = t.senderKey || (t.sender || '').trim().replace(/\s*\(\d+\s*messages?\)/gi, '').toLowerCase().trim();
            if (tKey !== filter) return false;
        }
        return true;
    });

  if (calendarView === 'Agenda') {
    const upNext = uniqueCalendarTasks.filter(t => t.deadline && new Date(t.deadline).getTime() >= startOfToday).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    // Group natively chronologically structurally mapping bounds dynamically
    const groupedAgenda = {};
    upNext.forEach(t => {
        const dateObj = new Date(t.deadline);
        const localKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
        if (!groupedAgenda[localKey]) groupedAgenda[localKey] = [];
        groupedAgenda[localKey].push(t);
    });

    const sortedDateKeys = Object.keys(groupedAgenda).sort((a, b) => {
        const [y1, m1, d1] = a.split('-');
        const [y2, m2, d2] = b.split('-');
        return new Date(y1, m1, d1) - new Date(y2, m2, d2);
    });

    return (
      <main className="main-workspace">
        <header className="workspace-header">
           <div className="calendar-toolbar">
              <h1 className="workspace-title" style={{margin: 0}}>Agenda</h1>
              <div className="calendar-controls">
                <button className={`filter-btn ${calendarView === 'Month' ? 'active' : ''}`} onClick={() => setCalendarView('Month')}>Month</button>
                <button className={`filter-btn ${calendarView === 'Agenda' ? 'active' : ''}`} onClick={() => setCalendarView('Agenda')}>Agenda</button>
              </div>
           </div>
        </header>

        <div className="content-area" style={{maxWidth: '800px', paddingTop: '24px'}}>
           {sortedDateKeys.length === 0 ? <div className="empty-state">No upcoming tasks scheduled for {filter === 'ALL' ? 'anyone' : filter}.</div> : (
              <div className="agenda-list">
                 {sortedDateKeys.map(dKey => {
                     const [y, m, d] = dKey.split('-');
                     const dateObj = new Date(y, m, d);
                     
                     let headerLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                     const dayTimeMs = dateObj.getTime();
                     if (dayTimeMs === startOfToday) headerLabel = 'TODAY - ' + headerLabel;
                     if (dayTimeMs === startOfToday + 86400000) headerLabel = 'TOMORROW - ' + headerLabel;

                     return (
                       <div key={dKey} className="agenda-date-group">
                           <div className="cal-agenda-date">{headerLabel}</div>
                           <div className="agenda-item-list" style={{display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px'}}>
                             {groupedAgenda[dKey].map(t => (
                                <div className="agenda-item" key={t.id}>
                                    <div className="agenda-time">
                                        {new Date(t.deadline).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit'})}
                                    </div>
                                    <div className="agenda-content">
                                        <span>{t.task}</span>
                                        <div style={{color: t.priority === 'HIGH' ? 'var(--status-high)' : t.status === 'COMPLETED' ? 'var(--status-completed)' : 'var(--text-muted)'}}>
                                            {t.sender} · {t.status === 'COMPLETED' ? 'Completed' : t.priority === 'HIGH' ? 'High Priority' : 'Pending'} {t.originalMessage ? '· Msg attached' : ''}
                                        </div>
                                    </div>
                                </div>
                             ))}
                           </div>
                       </div>
                     );
                 })}
              </div>
           )}
        </div>
      </main>
    );
  }

  // Month View Grouping
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

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
    <main className="main-workspace">
      <header className="workspace-header">
        <div className="calendar-toolbar">
           <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <h1 className="workspace-title" style={{margin: 0}}>{monthName}</h1>
              <div className="calendar-controls">
                <button className="filter-btn" onClick={() => setCalendarDate(new Date(year, month - 1, 1))}>&lt;</button>
                <button className="filter-btn" onClick={() => setCalendarDate(new Date())}>Today</button>
                <button className="filter-btn" onClick={() => setCalendarDate(new Date(year, month + 1, 1))}>&gt;</button>
              </div>
           </div>
           
           <div className="calendar-controls">
                <button className={`filter-btn ${calendarView === 'Month' ? 'active' : ''}`} onClick={() => setCalendarView('Month')}>Month</button>
                <button className={`filter-btn ${calendarView === 'Agenda' ? 'active' : ''}`} onClick={() => setCalendarView('Agenda')}>Agenda</button>
           </div>
        </div>
      </header>

      <div className="content-area" style={{paddingTop: '24px'}}>
        <div className="cal-month-grid">
           {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="cal-header-cell">{d}</div>)}
           {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="cal-cell empty"></div>;
              
              const localStr = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
              const dayTasks = tasksByDate[localStr] || [];
              const isToday = day.getTime() === startOfToday;
              
              return (
                <div key={localStr} className={`cal-cell ${isToday ? 'is-today' : ''}`}>
                    <div className="cal-date">{day.getDate()}</div>
                    {dayTasks.slice(0, 3).map(t => (
                        <div key={t.id} className={`cal-task-pill ${t.status === 'COMPLETED' ? 'completed' : t.priority === 'HIGH' ? 'high' : getTaskCategory(t) === 'OVERDUE' ? 'overdue' : ''}`} title={t.task}>
                            {t.task}
                        </div>
                    ))}
                    {dayTasks.length > 3 && <MoreTasksPopover tasks={dayTasks.slice(3)} />}
                </div>
              );
           })}
        </div>
      </div>
    </main>
  );
}
