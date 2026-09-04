import React from 'react';
import { useTasks } from '../../hooks/useTasks';
import { formatDate, getTaskCategory } from '../../utils/taskUtils';
import { useAppState } from '../../hooks/useAppState';

const urlPattern = /(https?:\/\/[^\s]+)/g;

function MessageContent({ text }) {
  if (!text) return <span className="task-detail-muted">No original message available.</span>;

  return text.split(urlPattern).map((part, index) => (
    /^https?:\/\//.test(part) ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="task-detail-link">
        {part}
      </a>
    ) : part
  ));
}

function DetailValue({ children, muted = false }) {
  return <dd className={muted ? 'task-detail-muted' : ''}>{children || 'Not available'}</dd>;
}

export default function TaskDetails({ task }) {
  const { updateStatus, deleteTask, globalTasks } = useTasks();
  const { setSelectedTaskId } = useAppState();

  if (!task) {
    return (
      <section className="task-details task-details-empty" aria-label="Task details">
        <div className="task-details-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 3h10a2 2 0 0 1 2 2v14l-3-2-4 2-4-2-3 2V5a2 2 0 0 1 2-2Z" /><path d="M9 8h6M9 12h4" /></svg>
        </div>
        <h2>Select a task</h2>
        <p>Choose a task from your inbox to view its complete details.</p>
      </section>
    );
  }

  const isCompleted = task.status === 'COMPLETED';
  const isOverdue = !isCompleted && getTaskCategory(task) === 'OVERDUE';
  const relatedMessages = globalTasks.filter(item => (
    item.task === task.task && item.sender === task.sender && item.deadline === task.deadline
  ));
  const messageCount = task.messageCount || task.messages?.length || relatedMessages.length || 1;
  const completionDate = task.completedAt || task.completedAtDate || task.completionDate;

  const handleStatusToggle = async () => {
    await updateStatus({ id: task.id, status: isCompleted ? 'PENDING' : 'COMPLETED' });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(task.id);
      setSelectedTaskId(null);
    }
  };

  return (
    <section className="task-details" aria-label="Task details">
      <div className="task-details-header">
        <div>
          <span className="task-details-kicker">Task Details</span>
          <div className="task-details-status-row">
            <span className={`task-details-status ${isCompleted ? 'completed' : isOverdue ? 'overdue' : 'pending'}`}>
              {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Pending'}
            </span>
            {task.priority && <span className="task-details-priority">{task.priority}</span>}
          </div>
        </div>
        <button className="task-details-close" onClick={() => setSelectedTaskId(null)} aria-label="Close task details"><span aria-hidden="true">×</span></button>
      </div>

      <div className="task-details-scroll">
        <h2 className="task-details-title">{task.task || 'Unnamed Task'}</h2>

        <dl className="task-details-meta">
          <div><dt>Status</dt><DetailValue>{isCompleted ? 'Completed' : 'Pending'}</DetailValue></div>
          <div><dt>Priority</dt><DetailValue muted={!task.priority}>{task.priority}</DetailValue></div>
          <div><dt>Deadline</dt><DetailValue muted={!task.deadline}>{task.deadline ? formatDate(task.deadline) : null}</DetailValue></div>
          <div><dt>Sender</dt><DetailValue muted={!task.sender}>{task.sender}</DetailValue></div>
          <div><dt>Message Count</dt><DetailValue>{messageCount}</DetailValue></div>
          <div><dt>Created</dt><DetailValue muted={!task.createdAt}>{task.createdAt ? formatDate(task.createdAt) : null}</DetailValue></div>
          {completionDate && <div><dt>Completed</dt><DetailValue>{formatDate(completionDate)}</DetailValue></div>}
        </dl>

        <div className="task-details-section">
          <h3>Original Message</h3>
          <div className="task-details-message">
            {task.messages?.length ? task.messages.map((message, index) => (
              <div className="task-details-message-block" key={message.id || index}>
                <span className="task-details-message-label">Message {index + 1}</span>
                <p><MessageContent text={message.content || message.message || message.originalMessage} /></p>
              </div>
            )) : <p><MessageContent text={task.originalMessage} /></p>}
          </div>
        </div>
      </div>

      <div className="task-details-actions">
        <button className="task-detail-action task-detail-action-primary" onClick={handleStatusToggle}>
          <span className={`task-detail-checkbox ${isCompleted ? 'checked' : ''}`} aria-hidden="true">{isCompleted ? '✓' : ''}</span>
          {isCompleted ? 'Completed' : 'Mark Complete'}
        </button>
        <button className="task-detail-action task-detail-action-danger" onClick={handleDelete}>Delete</button>
      </div>
    </section>
  );
}
