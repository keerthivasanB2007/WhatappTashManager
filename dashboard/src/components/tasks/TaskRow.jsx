import React from 'react';
import { useTasks } from '../../hooks/useTasks';
import { getTaskCategory, formatDate } from '../../utils/taskUtils';

export default function TaskRow({ task, isSelected, onSelect }) {
  const { updateStatus, globalTasks } = useTasks();
  
  const isCompleted = task.status === 'COMPLETED';
  const isOverdue = !isCompleted && getTaskCategory(task) === 'OVERDUE';
  const isHighPriority = task.priority === 'HIGH';
  
  const handleStatusToggle = async (e) => {
      if (e) {
          e.stopPropagation();
          e.preventDefault();
      }
      try {
         await updateStatus({ id: task.id, status: isCompleted ? 'PENDING' : 'COMPLETED' });
      } catch (err) {}
  };

  const titleText = task.task || 'Unnamed Task';
  const snippet = task.originalMessage ? task.originalMessage.replace(/\n/g, ' ') : '';
  
  let cleanSender = (task.sender || 'Unknown').replace(/\s*\(\d+\s*messages?\)/gi, '').trim();
  const match = task.sender?.match(/\((\d+)\s*messages?\)/i);
  const msgCount = match ? match[1] : (globalTasks?.filter(t => t.senderKey === task.senderKey).length > 1 ? globalTasks.filter(t => t.senderKey === task.senderKey).length : null);

  // Derive an icon color / type based on task content length/characters deterministic
  const charCode = titleText.charCodeAt(0) || 0;
  const colors = ['red', 'teal', 'yellow', 'blue'];
  const iconColor = colors[charCode % 4];

  // Specific icon SVG paths
  const getIcon = (color) => {
    switch (color) {
      case 'red': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
      case 'teal': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
      case 'yellow': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
      case 'blue': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;
      default: return null;
    }
  };

  return (
    <div 
      className={`task-row ${isCompleted ? 'is-completed' : ''} ${isSelected ? 'is-selected' : ''} ${isOverdue ? 'is-overdue' : ''} ${isHighPriority ? 'is-high' : ''}`} 
      onClick={() => onSelect?.(task.id)} 
      role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(task.id); }}
    >
        <div className="task-row-checkbox-col" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
           <button 
              type="button" 
              className={`task-checkbox-square ${isCompleted ? 'checked' : ''}`} 
              onClick={handleStatusToggle}
           >
              {isCompleted && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
           </button>
        </div>
        
        <div className={`task-row-icon icon-${iconColor}`}>
           {getIcon(iconColor)}
        </div>

        <div className="task-row-content-col">
            <div className="task-row-title-line">
                <span className="task-row-title" title={titleText}>{isCompleted ? <s>{titleText}</s> : titleText}</span>
            </div>
            {snippet && <div className="task-row-snippet">{snippet}</div>}
        </div>
        
        <div className="task-row-meta-col">
            <div className="task-row-top-meta">
                {isOverdue && <span className="task-pill overdue-pill">Overdue</span>}
                <span className="task-row-deadline">📅 {task.deadline ? formatDate(task.deadline) : 'No Date'}</span>
            </div>
            <div className="task-row-sender" title={cleanSender}>
                👥 {cleanSender} {msgCount && <span className="sender-count-dot">· {msgCount}</span>}
            </div>
        </div>

        <div className="task-row-chevron">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
    </div>
  );
}
