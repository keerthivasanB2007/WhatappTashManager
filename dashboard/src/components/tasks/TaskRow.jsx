import React from 'react';
import { useTasks } from '../../hooks/useTasks';
import { getTaskCategory, formatDate } from '../../utils/taskUtils';

export default function TaskRow({ task, isSelected, onSelect }) {
  const { updateStatus, globalTasks } = useTasks();
  
  const isCompleted = task.status === 'COMPLETED';
  const isOverdue = !isCompleted && getTaskCategory(task) === 'OVERDUE';
  const isHighPriority = task.priority === 'HIGH';
  
  const handleStatusToggle = async (e) => {
      e.stopPropagation();
      try {
         await updateStatus({ id: task.id, status: isCompleted ? 'PENDING' : 'COMPLETED' });
      } catch (err) {}
  };

  const titleText = task.task || 'Unnamed Task';
  
  const snippet = task.originalMessage ? task.originalMessage.replace(/\n/g, ' ') : '';
  
  // Extract number of messages if it was part of raw sender for sender tracking formatting
  let cleanSender = (task.sender || 'Unknown').replace(/\s*\(\d+\s*messages?\)/gi, '').trim();
  const match = task.sender?.match(/\((\d+)\s*messages?\)/i);
  const msgCount = match ? match[1] : (globalTasks?.filter(t => t.senderKey === task.senderKey).length > 1 ? globalTasks.filter(t => t.senderKey === task.senderKey).length : null);

  return (
    <div 
      className={`task-row ${isCompleted ? 'is-completed' : ''} ${isSelected ? 'is-selected' : ''} ${isOverdue ? 'is-overdue' : ''}`} 
      onClick={() => onSelect?.(task.id)} 
      role="button" 
      tabIndex={0} 
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(task.id); }}
    >
        <div className="task-row-checkbox-col">
           <button 
              className={`task-checkbox-square ${isCompleted ? 'checked' : ''}`} 
              onClick={handleStatusToggle}
              title={isCompleted ? "Mark pending" : "Mark complete"}
           >
              {isCompleted && (
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
              )}
           </button>
        </div>
        
        <div className="task-row-content-col">
            <div className="task-row-title-line">
                {isHighPriority && !isCompleted && <span className="priority-dot" title="High Priority" />}
                <span className="task-row-title" title={titleText}>{titleText}</span>
            </div>
            {snippet && <div className="task-row-snippet">{snippet}</div>}
        </div>
        
        <div className="task-row-meta-col">
            <div className="task-row-top-meta">
                {isOverdue && <span className="overdue-pill">Overdue</span>}
                <span className="task-row-deadline">
                   {task.deadline ? formatDate(task.deadline) : ''}
                </span>
            </div>
            <div className="task-row-sender">
                {cleanSender} {msgCount && <span className="sender-count-dot">· {msgCount}</span>}
            </div>
        </div>
    </div>
  );
}
