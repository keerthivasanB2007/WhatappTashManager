import React, { createContext, useContext, useState } from 'react';

const BaseContext = createContext();

export function AppStateProvider({ children }) {
  const [filter, setFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState('TASKS'); // 'TASKS' or 'CALENDAR'
  const [calendarView, setCalendarView] = useState('Month'); // 'Month' or 'Agenda'
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState('Connected');

  return (
    <BaseContext.Provider value={{
      filter, setFilter,
      sortBy, setSortBy,
      searchQuery, setSearchQuery,
      currentView, setCurrentView,
      calendarView, setCalendarView,
      calendarDate, setCalendarDate,
      sidebarOpen, setSidebarOpen,
      backendStatus, setBackendStatus
    }}>
      {children}
    </BaseContext.Provider>
  );
}

export function useAppState() {
  return useContext(BaseContext);
}
