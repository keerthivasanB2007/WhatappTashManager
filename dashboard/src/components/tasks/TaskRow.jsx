import React, { useState } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { getTaskCategory, formatDate } from '../../utils/taskUtils';

export default function TaskRow({ task, isSelected, onSelect }) {
  const { updateStatus, globalTasks } = useTasks();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const completed = task.status === 'COMPLETED';
  const overdue = !completed && getTaskCategory(task) === 'OVERDUE';
  const sender = (task.sender || 'Unknown sender').replace(/\s*\(\d+\s*messages?\)/i, '').trim();
  const count = globalTasks.filter(item => item.senderKey && item.senderKey === task.senderKey).length;
  const toggle = async event => {
    event.stopPropagation();
    if (saving) return;
    setSaving(true); setError('');
    try { await updateStatus({ id: task.id, status: completed ? 'PENDING' : 'COMPLETED' }); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Could not update this task. Please try again.'); }
    finally { setSaving(false); }
  };
  return <article className={`task-row ${overdue ? 'is-overdue' : ''} ${task.priority === 'HIGH' ? 'is-high' : ''} ${completed ? 'is-completed' : ''} ${isSelected ? 'is-selected' : ''}`} onClick={() => onSelect(task.id)}><button className="check-button" disabled={saving} aria-label={completed ? 'Mark pending' : 'Mark complete'} onClick={toggle}>{saving ? '…' : completed && '✓'}</button><div className={`priority-dot ${task.priority?.toLowerCase() || 'medium'}`} /><div className="task-copy"><h3>{task.task || 'Untitled task'}</h3><p>{error || task.originalMessage || 'No original message available'}</p></div><div className="task-meta">{overdue && <span className="overdue-chip">Overdue</span>}<span className="date">{task.deadline ? formatDate(task.deadline) : 'No deadline'}</span><span className="sender">{sender}{count > 1 && ` · ${count}`}</span></div></article>;
}
