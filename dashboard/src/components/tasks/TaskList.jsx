import React, { useMemo } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { useAppState } from '../../hooks/useAppState';
import { getTaskCategory, getUniqueTasks } from '../../utils/taskUtils';
import TaskRow from './TaskRow';

const senderKey = task => task.senderKey || (task.sender || '').replace(/\s*\(\d+\s*messages?\)/i, '').trim().toLowerCase();
const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'; };

export default function TaskList() {
  const { globalTasks, isLoading, isError, updateStatus, deleteTask } = useTasks();
  const { filter, sortBy, setSortBy, searchQuery, selectedTaskId, setSelectedTaskId, setFilter } = useAppState();
  const [selectedTasks, setSelectedTasks] = React.useState(new Set());
  const [isBulkSaving, setIsBulkSaving] = React.useState(false);
  
  const toggleSelect = (id) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkComplete = async () => {
    if (isBulkSaving || selectedTasks.size === 0) return;
    setIsBulkSaving(true);
    try {
      await Promise.all(Array.from(selectedTasks).map(id => updateStatus({ id, status: filter === 'COMPLETED' ? 'PENDING' : 'COMPLETED' })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsBulkSaving(false);
      setSelectedTasks(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (isBulkSaving || selectedTasks.size === 0) return;
    setIsBulkSaving(true);
    try {
      await Promise.all(Array.from(selectedTasks).map(id => deleteTask(id)));
    } catch (e) {
      console.error(e);
    } finally {
      setIsBulkSaving(false);
      setSelectedTasks(new Set());
    }
  };

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
  const rows = list => list.map(task => <TaskRow key={task.id} task={task} isSelected={selectedTaskId === task.id} isChecked={selectedTasks.has(task.id)} onToggleCheck={() => toggleSelect(task.id)} onSelect={setSelectedTaskId} />);

  return <main className="main-workspace"><header className="workspace-header"><div>{filter === 'TODAY' ? <><p className="eyebrow">YOUR FOCUS</p><h1>{greeting()}, Keerthivasan.</h1><p>Here’s what deserves your attention today.</p></> : <><p className="eyebrow">TASKS</p><h1>{title}</h1><p>Your WhatsApp tasks, arranged for action.</p></>}</div><div className="workspace-controls"><select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="deadline">Deadline first</option><option value="priority">Priority first</option><option value="recent">Recently added</option></select></div></header><section className="task-content">
  {selectedTasks.size > 0 && (
    <div className="bulk-action-bar" style={{ display: 'flex', gap: '12px', padding: '12px 16px', background: 'var(--surface-color, #fff)', borderBottom: '1px solid var(--border-color, #eaeaea)', position: 'sticky', top: 0, zIndex: 10, alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <span style={{ fontWeight: 500 }}>{selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected</span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" className="primary-button" style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: 'var(--primary-color, #0f172a)', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }} disabled={isBulkSaving} onClick={handleBulkComplete}>{isBulkSaving ? 'Saving...' : filter === 'COMPLETED' ? 'Mark as pending' : 'Mark as completed'}</button>
        <button type="button" className="secondary-button" style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ff4d4f', background: 'transparent', color: '#ff4d4f', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }} disabled={isBulkSaving} onClick={handleBulkDelete}>Delete</button>
      </div>
    </div>
  )}
  {isLoading ? <div className="empty-state">Loading your tasks…</div> : isError ? <div className="empty-state">Couldn’t load tasks. Please refresh and try again.</div> : tasks.length === 0 ? <div className="empty-state"><strong>Nothing here.</strong><span>{filter === 'TODAY' ? 'You’re clear for today.' : 'No tasks match this view.'}</span></div> : filter === 'TODAY' ? <>{overdue.length > 0 && <TaskSection label="Overdue" count={overdue.length} danger>{rows(overdue)}</TaskSection>}{dueToday.length > 0 && <TaskSection label="Due today" count={dueToday.length}>{rows(dueToday)}</TaskSection>}{overdue.length === 0 && dueToday.length === 0 && <div className="empty-state">You’re clear for today.</div>}</> : <div className="task-list">{rows(tasks)}</div>}</section></main>;
}
function TaskSection({ label, count, danger, children }) { return <section className={`task-section ${danger ? 'danger-section' : ''}`}><div className="section-heading"><span>{label}</span><b>{count}</b></div><div className="task-list">{children}</div></section>; }
