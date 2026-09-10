import React from 'react';
import { useTasks } from '../../hooks/useTasks';
import { getTaskCategory } from '../../utils/taskUtils';

export default function MetricsPanel() {
  const { globalTasks } = useTasks();
  
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const pendingTasks = globalTasks.filter(t => t.status !== 'COMPLETED');
  const completedTasks = globalTasks.filter(t => t.status === 'COMPLETED');
  const overdueTasks = pendingTasks.filter(t => t.deadline && new Date(t.deadline).getTime() < startOfToday);
  const highPriorityTasks = pendingTasks.filter(t => t.priority === 'HIGH');
  const todayTasks = pendingTasks.filter(t => getTaskCategory(t) === 'TODAY');

  return (
    <aside className="right-rail">
       <div className="rail-section">
           <h3 className="rail-title">Quick Metrics</h3>
           <div className="quick-metrics">
               <div className="metric-row">Total Tasks <span>{globalTasks.length}</span></div>
               <div className="metric-row">Pending <span>{pendingTasks.length}</span></div>
               <div className="metric-row" style={{color: 'var(--status-completed)'}}>Completed <span style={{background: 'var(--status-completed-bg)'}}>{completedTasks.length}</span></div>
               <div className="metric-row" style={{color: 'var(--status-overdue)'}}>Overdue <span style={{background: 'var(--status-overdue-bg)'}}>{overdueTasks.length}</span></div>
               <div className="metric-row" style={{color: 'var(--status-high)'}}>High Priority <span style={{background: 'var(--status-pending-bg)'}}>{highPriorityTasks.length}</span></div>
           </div>
       </div>
       
       <div className="rail-section">
           <h3 className="rail-title">Today's Snapshot</h3>
           <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
               <strong style={{color: overdueTasks.length > 0 ? 'var(--status-overdue)' : 'inherit'}}>{overdueTasks.length} overdue</strong> · {todayTasks.length} due today
           </div>
       </div>
    </aside>
  );
}
