import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './hooks/useAuth';
import { AppStateProvider } from './hooks/useAppState';
import Login from './components/auth/Login';
import AppShell from './components/layout/AppShell';

const queryClient = new QueryClient();

function MainApp() {
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <AppStateProvider>
       <AppShell />
    </AppStateProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
       <MainApp />
    </QueryClientProvider>
  );
}
