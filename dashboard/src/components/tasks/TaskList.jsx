import React, { useMemo } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { useAppState } from '../../hooks/useAppState';
import { getTaskCategory, getUniqueTasks } from '../../utils/taskUtils';
import TaskRow from './TaskRow';

const senderKey = task => task.senderKey || (task.sender || '').replace(/\s*\(\d+\s*messages?\)/i, '').trim().toLowerCase();
const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'; };

export default function TaskList() {
  const { globalTasks, isLoading, isError } = useTasks();
  const { filter, sortBy, setSortBy, searchQuery, selectedTaskId, setSelectedTaskId, setFilter } = useAppState();
  const unique = useMemo(() => getUniqueTasks(globalTasks), [globalTasks]);
  const senders = useMemo(() => [...new Map(unique.map(task => [senderKey(task), task.sender])).entries()], [unique]);

  if (filter === 'SENDERS') return <main className="main-workspace"><header className="workspace-header"><div><p className="eyebrow">ORGANIZE</p><h1>Sender groups</h1><p>Browse every task by the person or WhatsApp group it came from.</p></div></header><div className="sender-grid">{senders.map(([key, name]) => { const count = unique.filter(task => senderKey(task) === key && task.status !== 'COMPLETED').length; return <button key={key} className="sender-card" onClick={() => setFilter(key)}><span>{(name || '?').slice(0, 2).toUpperCase()}</span><div><strong>{name || 'Unknown sender'}</strong><small>{count} open {count === 1 ? 'task' : 'tasks'}</small></div><b>›</b></button>; })}</div></main>;

  const tasks = unique.filter(task => {
    const category = getTaskCategory(task);
    const haystack = `${task.task || ''} ${task.originalMessage || ''} ${task.sender || ''}`.toLowerCase();
    if (searchQuery && !haystack.includes(searchQuery.toLowerCase())) return false;
    if (filter === 'TODAY') return task.status !== 'COMPLETED' && (category === 'OVERDUE' || category === 'TODAY');
    if (filter === 'ALL') return true;
    if (filter === 'COMPLETED') return task.status === 'COMPLETED';
    if (filter === 'OVERDUE') return task.status !== 'COMPLETED' && category === 'OVERDUE';
    if (filter === 'UPCOMING') return task.status !== 'COMPLETED' && ['TOMORROW', 'THIS_WEEK', 'LATER'].includes(category);
    if (filter === 'HIGH_PRIORITY') return task.status !== 'COMPLETED' && task.priority === 'HIGH';
    return senderKey(task) === filter;
  }).sort((a, b) => sortBy === 'priority' ? ({ HIGH: 3, MEDIUM: 2, LOW: 1 }[b.priority] || 0) - ({ HIGH: 3, MEDIUM: 2, LOW: 1 }[a.priority] || 0) : sortBy === 'recent' ? new Date(b.createdAt) - new Date(a.createdAt) : (a.deadline ? new Date(a.deadline) : Infinity) - (b.deadline ? new Date(b.deadline) : Infinity));

  const overdue = tasks.filter(task => getTaskCategory(task) === 'OVERDUE' && task.status !== 'COMPLETED');
  const dueToday = tasks.filter(task => getTaskCategory(task) === 'TODAY' && task.status !== 'COMPLETED');
  const title = { TODAY: 'Today', ALL: 'All tasks', UPCOMING: 'Upcoming', OVERDUE: 'Overdue', HIGH_PRIORITY: 'High priority', COMPLETED: 'Completed' }[filter] || senders.find(([key]) => key === filter)?.[1] || 'Tasks';
  const rows = list => list.map(task => <TaskRow key={task.id} task={task} isSelected={selectedTaskId === task.id} onSelect={setSelectedTaskId} />);

  return <main className="main-workspace"><header className="workspace-header"><div>{filter === 'TODAY' ? <><p className="eyebrow">YOUR FOCUS</p><h1>{greeting()}, Keerthivasan.</h1><p>Here’s what deserves your attention today.</p></> : <><p className="eyebrow">TASKS</p><h1>{title}</h1><p>Your WhatsApp tasks, arranged for action.</p></>}</div><div className="workspace-controls"><select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="deadline">Deadline first</option><option value="priority">Priority first</option><option value="recent">Recently added</option></select></div></header><section className="task-content">{isLoading ? <div className="empty-state">Loading your tasks…</div> : isError ? <div className="empty-state">Couldn’t load tasks. Please refresh and try again.</div> : tasks.length === 0 ? <div className="empty-state"><strong>Nothing here.</strong><span>{filter === 'TODAY' ? 'You’re clear for today.' : 'No tasks match this view.'}</span></div> : filter === 'TODAY' ? <>{overdue.length > 0 && <TaskSection label="Overdue" count={overdue.length} danger>{rows(overdue)}</TaskSection>}{dueToday.length > 0 && <TaskSection label="Due today" count={dueToday.length}>{rows(dueToday)}</TaskSection>}{overdue.length === 0 && dueToday.length === 0 && <div className="empty-state">You’re clear for today.</div>}</> : <div className="task-list">{rows(tasks)}</div>}</section></main>;
}
function TaskSection({ label, count, danger, children }) { return <section className={`task-section ${danger ? 'danger-section' : ''}`}><div className="section-heading"><span>{label}</span><b>{count}</b></div><div className="task-list">{children}</div></section>; }
