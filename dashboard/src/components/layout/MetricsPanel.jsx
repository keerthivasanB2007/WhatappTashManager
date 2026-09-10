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
           <div className="rail-header">
               <h3 className="rail-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> Quick Metrics</h3>
               <span className="rail-link">View All</span>
           </div>
           <div className="quick-metrics-list">
               <div className="qm-row"><div className="qm-icon qm-blue">📄</div> Total Tasks <span>{globalTasks.length}</span></div>
               <div className="qm-row"><div className="qm-icon qm-yellow">🕒</div> Pending <span>{pendingTasks.length}</span></div>
               <div className="qm-row"><div className="qm-icon qm-green">✅</div> Completed <span>{completedTasks.length}</span></div>
               <div className="qm-row"><div className="qm-icon qm-red">⚠️</div> Overdue <span>{overdueTasks.length}</span></div>
               <div className="qm-row"><div className="qm-icon qm-orange">🔥</div> High Priority <span>{highPriorityTasks.length}</span></div>
           </div>
       </div>
       
       <div className="rail-section">
           <div className="rail-header">
               <h3 className="rail-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Today's Snapshot</h3>
           </div>
           <div className="snapshot-box">
              <div className="snapshot-donut">
                  <svg width="48" height="48" viewBox="0 0 36 36">
                     <path className="donut-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(251, 113, 133, 0.2)" strokeWidth="4" />
                     <path className="donut-fill" strokeDasharray={`${Math.max(1, (overdueTasks.length/Math.max(1, (todayTasks.length + overdueTasks.length))))*100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FB7185" strokeWidth="4" />
                  </svg>
              </div>
              <div className="snapshot-text">
                  <div className="snapshot-overdue"><strong>{overdueTasks.length}</strong> overdue</div>
                  <div className="snapshot-due"><strong>{todayTasks.length}</strong> due today</div>
              </div>
           </div>
       </div>

       <div className="motivation-card">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
           <div className="motivation-text">
               <strong>Stay consistent.</strong>
               <span>You're doing great!</span>
           </div>
       </div>

       <div className="rail-section">
           <div className="rail-header">
               <h3 className="rail-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> Recent Activity</h3>
           </div>
           <div className="activity-list">
               <div className="activity-row"><span className="act-dot act-red"></span>Task marked as overdue <span className="act-time">2h ago</span></div>
               <div className="activity-row"><span className="act-dot act-yellow"></span>New task captured <span className="act-time">3h ago</span></div>
               <div className="activity-row"><span className="act-dot act-green"></span>Task completed <span className="act-time">6h ago</span></div>
               <div className="activity-row"><span className="act-dot act-green"></span>New task captured <span className="act-time">7h ago</span></div>
           </div>
       </div>
    </aside>
  );
}
