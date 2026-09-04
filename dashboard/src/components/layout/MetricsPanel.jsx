import React from 'react';
import { useTasks } from '../../hooks/useTasks';
import { getTaskCategory } from '../../utils/taskUtils';

export default function MetricsPanel() {
  const { globalTasks } = useTasks();
  
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const todayTasks = globalTasks.filter(t => getTaskCategory(t) === 'TODAY');

  return (
    <aside className="right-rail">
       <div className="rail-section">
           <h3 className="rail-title">Quick Metrics</h3>
           <div className="quick-metrics">
               <div className="metric-row">Total Tasks <span>{globalTasks.length}</span></div>
               <div className="metric-row">Pending <span>{globalTasks.filter(t => t.status !== 'COMPLETED').length}</span></div>
               <div className="metric-row" style={{color: 'var(--status-completed)'}}>Completed <span style={{background: 'var(--status-completed-bg)'}}>{globalTasks.filter(t => t.status === 'COMPLETED').length}</span></div>
               <div className="metric-row" style={{color: 'var(--status-overdue)'}}>Overdue <span style={{background: 'var(--status-overdue-bg)'}}>{globalTasks.filter(t => t.status !== 'COMPLETED' && t.deadline && new Date(t.deadline).getTime() < startOfToday).length}</span></div>
               <div className="metric-row" style={{color: 'var(--status-high)'}}>High Priority <span style={{background: 'var(--status-pending-bg)'}}>{globalTasks.filter(t => t.status === 'PENDING' && t.priority === 'HIGH').length}</span></div>
           </div>
       </div>
       
       <div className="rail-section">
           <h3 className="rail-title">Today's Agenda</h3>
           {todayTasks.length === 0 ? (
               <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>No events today.</div>
           ) : (
               <div className="agenda-list">
                   {todayTasks.map(t => (
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
  );
}
