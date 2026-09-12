import React, { useEffect, useState } from 'react';
import TopBar from './TopBar';
import MobileNav from './MobileNav';
import Sidebar from './Sidebar';
import MetricsPanel from './MetricsPanel';
import TaskList from '../tasks/TaskList';
import CalendarRoot from '../calendar/CalendarRoot';
import TaskDetails from '../tasks/TaskDetails';
import { useAppState } from '../../hooks/useAppState';
import { useTasks } from '../../hooks/useTasks';

export default function AppShell() {
  const { currentView, selectedTaskId, setSelectedTaskId, sidebarCollapsed, railHidden } = useAppState();
  const { globalTasks } = useTasks();
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem('dashboard-sidebar-width')) || 224);
  const [railWidth, setRailWidth] = useState(() => Number(localStorage.getItem('dashboard-rail-width')) || 272);
  const selectedTask = globalTasks.find(task => task.id === selectedTaskId);
  useEffect(() => { const close = e => e.key === 'Escape' && setSelectedTaskId(null); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [setSelectedTaskId]);
  const resize = (panel, event) => {
    event.preventDefault(); const start = event.clientX; const initial = panel === 'sidebar' ? sidebarWidth : railWidth;
    const move = e => { const raw = panel === 'sidebar' ? initial + e.clientX - start : initial - e.clientX + start; const next = Math.round(Math.min(panel === 'sidebar' ? 300 : 360, Math.max(panel === 'sidebar' ? 68 : 240, raw)) / 8) * 8; if (panel === 'sidebar') { setSidebarWidth(next); localStorage.setItem('dashboard-sidebar-width', next); } else { setRailWidth(next); localStorage.setItem('dashboard-rail-width', next); } };
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop);
  };
  const isSidebarCompact = sidebarCollapsed || sidebarWidth < 140;
  return <div className="app-layout"><TopBar /><div className={`app-body ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${railHidden ? 'rail-hidden' : ''}`} style={{ '--sidebar-width': `${sidebarCollapsed ? 68 : sidebarWidth}px`, '--rail-width': `${railWidth}px` }}><Sidebar isCompact={isSidebarCompact} />{!sidebarCollapsed && <div className="panel-resize-handle" onPointerDown={e => resize('sidebar', e)} />}{currentView === 'CALENDAR' ? <CalendarRoot /> : <TaskList />}{!railHidden && <div className="panel-resize-handle" onPointerDown={e => resize('rail', e)} />}{!railHidden && <MetricsPanel />}</div><MobileNav />{selectedTask && <div className="task-details-backdrop" onMouseDown={() => setSelectedTaskId(null)}><div className="task-details-dialog" onMouseDown={e => e.stopPropagation()}><TaskDetails task={selectedTask} /></div></div>}</div>;
}
