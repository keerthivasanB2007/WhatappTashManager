import React, { createContext, useContext, useState } from 'react';
const BaseContext = createContext();
const stored = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
export function AppStateProvider({ children }) {
  const [filter, setFilter] = useState('TODAY'); const [sortBy, setSortBy] = useState('deadline'); const [searchQuery, setSearchQuery] = useState(''); const [currentView, setCurrentView] = useState('TASKS'); const [calendarView, setCalendarView] = useState('Month'); const [calendarDate, setCalendarDate] = useState(new Date()); const [selectedTaskId, setSelectedTaskId] = useState(null); const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => stored('dashboard-sidebar-collapsed', false)); const [railHidden, setRailHiddenState] = useState(() => stored('dashboard-rail-hidden', false));
  const setSidebarCollapsed = value => { setSidebarCollapsedState(value); localStorage.setItem('dashboard-sidebar-collapsed', JSON.stringify(value)); }; const setRailHidden = value => { setRailHiddenState(value); localStorage.setItem('dashboard-rail-hidden', JSON.stringify(value)); };
  return <BaseContext.Provider value={{ filter, setFilter, sortBy, setSortBy, searchQuery, setSearchQuery, currentView, setCurrentView, calendarView, setCalendarView, calendarDate, setCalendarDate, selectedTaskId, setSelectedTaskId, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, railHidden, setRailHidden, backendStatus: 'Connected' }}>{children}</BaseContext.Provider>;
}
export const useAppState = () => useContext(BaseContext);
