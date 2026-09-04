import React, { useEffect, useState } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import MetricsPanel from './MetricsPanel';
import TaskList from '../tasks/TaskList';
import CalendarRoot from '../calendar/CalendarRoot';
import TaskDetails from '../tasks/TaskDetails';
import { useAppState } from '../../hooks/useAppState';
import { useTasks } from '../../hooks/useTasks';

export default function AppShell() {
  const { currentView, selectedTaskId, setSelectedTaskId } = useAppState();
  const { globalTasks } = useTasks();
  const selectedTask = globalTasks.find(task => task.id === selectedTaskId) || null;
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem('dashboard-sidebar-width')) || 240);
  const [railWidth, setRailWidth] = useState(() => Number(localStorage.getItem('dashboard-rail-width')) || 280);

  useEffect(() => {
    const closeOnEscape = event => event.key === 'Escape' && setSelectedTaskId(null);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [setSelectedTaskId]);

  const resizePanel = (panel, event) => {
    event.preventDefault();
    const startX = event.clientX;
    const initial = panel === 'sidebar' ? sidebarWidth : railWidth;
    const update = moveEvent => {
      const next = panel === 'sidebar'
        ? Math.min(340, Math.max(180, initial + moveEvent.clientX - startX))
        : Math.min(380, Math.max(220, initial - moveEvent.clientX + startX));
      if (panel === 'sidebar') {
        setSidebarWidth(next);
        localStorage.setItem('dashboard-sidebar-width', String(next));
      } else {
        setRailWidth(next);
        localStorage.setItem('dashboard-rail-width', String(next));
      }
    };
    const stop = () => {
      window.removeEventListener('pointermove', update);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', update);
    window.addEventListener('pointerup', stop);
  };

  return (
    <div className="app-layout">
      <TopBar />
      <div className="app-body" style={{ '--sidebar-width': `${sidebarWidth}px`, '--rail-width': `${railWidth}px` }}>
        <Sidebar />
        <div className="panel-resize-handle" onPointerDown={event => resizePanel('sidebar', event)} role="separator" aria-label="Resize sidebar" />
        {currentView === 'TASKS' ? <TaskList /> : <CalendarRoot />}
        <div className="panel-resize-handle panel-resize-handle-rail" onPointerDown={event => resizePanel('rail', event)} role="separator" aria-label="Resize quick metrics" />
        <MetricsPanel />
      </div>
      {selectedTask && <div className="task-details-backdrop" onMouseDown={() => setSelectedTaskId(null)}>
        <div className="task-details-dialog" onMouseDown={event => event.stopPropagation()}>
          <TaskDetails task={selectedTask} />
        </div>
      </div>}
    </div>
  );
}
