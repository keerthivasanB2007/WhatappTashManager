import React from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import MetricsPanel from './MetricsPanel';
import TaskList from '../tasks/TaskList';
import CalendarRoot from '../calendar/CalendarRoot';
import TaskDetails from '../tasks/TaskDetails';
import { useAppState } from '../../hooks/useAppState';
import { useTasks } from '../../hooks/useTasks';

export default function AppShell() {
  const { currentView } = useAppState();
  const { globalTasks } = useTasks();
  const { selectedTaskId } = useAppState();
  const selectedTask = globalTasks.find(task => task.id === selectedTaskId) || null;

  return (
    <div className="app-layout">
      <TopBar />
      <div className={`app-body ${selectedTask ? 'task-detail-open' : ''}`}>
        <Sidebar />
        {currentView === 'TASKS' ? <>
          <TaskDetails task={selectedTask} />
          <TaskList />
        </> : <CalendarRoot />}
        <MetricsPanel />
      </div>
    </div>
  );
}
