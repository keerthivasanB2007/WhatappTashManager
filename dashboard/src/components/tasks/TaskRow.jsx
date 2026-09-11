import React, { useState } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { getTaskCategory, formatDate } from '../../utils/taskUtils';

export default function TaskRow({ task, isSelected, isChecked, onToggleCheck, onSelect }) {
  const { globalTasks } = useTasks();
  const completed = task.status === 'COMPLETED';
  const overdue = !completed && getTaskCategory(task) === 'OVERDUE';
  const sender = (task.sender || 'Unknown sender').replace(/\s*\(\d+\s*messages?\)/i, '').trim();
  const count = globalTasks.filter(item => item.senderKey && item.senderKey === task.senderKey).length;
  
  const handleCheck = event => {
    event.stopPropagation();
    if (onToggleCheck) onToggleCheck();
  };

  return <article className={`task-row ${overdue ? 'is-overdue' : ''} ${task.priority === 'HIGH' ? 'is-high' : ''} ${completed ? 'is-completed' : ''} ${isSelected ? 'is-selected' : ''}`} onClick={() => onSelect(task.id)}>
    <button type="button" className={`check-button ${isChecked ? 'is-checked' : ''}`} aria-label={isChecked ? 'Deselect task' : 'Select task'} onClick={handleCheck} style={isChecked ? { backgroundColor: 'var(--primary-color, #0f172a)', borderColor: 'var(--primary-color, #0f172a)', color: '#fff' } : {}}>
      {isChecked ? '✓' : completed ? '✓' : ''}
    </button>
    <div className={`priority-dot ${task.priority?.toLowerCase() || 'medium'}`} />
    <div className="task-copy"><h3>{task.task || 'Untitled task'}</h3><p>{task.originalMessage || 'No original message available'}</p></div>
    <div className="task-meta">{overdue && <span className="overdue-chip">Overdue</span>}<span className="date">{task.deadline ? formatDate(task.deadline) : 'No deadline'}</span><span className="sender">{sender}{count > 1 && ` · ${count}`}</span></div>
  </article>;
}
