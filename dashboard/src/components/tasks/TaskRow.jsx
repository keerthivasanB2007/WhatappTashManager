import React from 'react';
import { useTasks } from '../../hooks/useTasks';
import { getTaskCategory, formatDate, extractUrl } from '../../utils/taskUtils';

export default function TaskRow({ task, isSelected, onSelect }) {
  const { updateStatus, deleteTask, globalTasks } = useTasks();
  
  const url = extractUrl(task.originalMessage);
  const isCompleted = task.status === 'COMPLETED';
  const isOverdue = !isCompleted && getTaskCategory(task) === 'OVERDUE';
  const isHighPriority = task.priority === 'HIGH';
  
  const handleStatusToggle = async (e) => {
      e.stopPropagation();
      try {
         await updateStatus({ id: task.id, status: isCompleted ? 'PENDING' : 'COMPLETED' });
      } catch (err) {
         // Should realistically hook up a toast
      }
  };

  const handleDelete = async (e) => {
      e.stopPropagation();
      if (window.confirm("Are you sure you want to delete this task?")) {
          await deleteTask(task.id);
      }
  };

  const duplicatesCount = globalTasks.filter(t => t.task === task.task && t.sender === task.sender && t.deadline === task.deadline).length;

  return (
    <div className={`task-item ${isCompleted ? 'task-item-completed' : ''} ${isSelected ? 'task-item-selected' : ''}`} onClick={() => onSelect?.(task.id)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(task.id); }}>
        <div className="task-checkbox-container">
           <button 
              className={`task-checkbox-btn ${isCompleted ? 'completed' : ''}`} 
              onClick={handleStatusToggle}
              title={isCompleted ? "Mark pending" : "Mark complete"}
           >
              {isCompleted ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><polyline points="7 12 10 15 17 8"></polyline></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
              )}
           </button>
        </div>
        
        <div className="task-content">
            <div className="task-title-row">
                <span className="task-title">{task.task || 'Unnamed Task'}</span>
                <div className="task-meta-badges">
                    {isHighPriority && !isCompleted && (
                        <span className="badge-priority">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            High
                        </span>
                    )}
                    {isOverdue && <span className="badge-overdue">Overdue</span>}
                </div>
            </div>
            
            <div className="task-subtitle-row">
                <span className="badge-source">{task.sender}</span>
                <span style={{opacity: 0.5}}>·</span>
                <span>{task.category || 'Inbox'}</span>
                {duplicatesCount > 1 && (
                    <>
                       <span style={{opacity: 0.5}}>·</span>
                       <span>Reported in {duplicatesCount} messages</span>
                    </>
                )}
            </div>
            
            {task.originalMessage && (
                <div className="task-original-msg">
                    "{task.originalMessage}"
                </div>
            )}
        </div>
        
        <div className="task-actions">
            <span className={`task-deadline ${isOverdue ? 'is-overdue' : ''}`}>
               {task.deadline ? formatDate(task.deadline) : 'No due date'}
            </span>
            {url && (
                <a className="btn-link" href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                    Open Link ↗
                </a>
            )}
            
            <div className="task-more-menu">
               <button className="btn-more" onClick={handleDelete} title="Delete target">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
               </button>
            </div>
        </div>
    </div>
  );
}
