import React from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import MetricsPanel from './MetricsPanel';
import TaskList from '../tasks/TaskList';
import CalendarRoot from '../calendar/CalendarRoot';
import { useAppState } from '../../hooks/useAppState';

export default function AppShell() {
  const { currentView } = useAppState();

  return (
    <div className="app-layout">
      <TopBar />
      <div className="app-body">
        <Sidebar />
        {currentView === 'TASKS' ? <TaskList /> : <CalendarRoot />}
        <MetricsPanel />
      </div>
    </div>
  );
}
