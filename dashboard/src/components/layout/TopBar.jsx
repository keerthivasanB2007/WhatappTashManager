import React, { useState } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useAuth } from '../../hooks/useAuth';

export default function TopBar() {
  const { searchQuery, setSearchQuery, sidebarOpen, setSidebarOpen, backendStatus } = useAppState();
  const { logout } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <header className="global-topbar">
      <div className="topbar-left">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className="topbar-logo">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
             WhatsAppTaskManager
             <span>Workspace</span>
          </div>
      </div>
      
      <div className="search-input-wrapper">
         <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
         <input type="text" className="search-input" placeholder="Search tasks, messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
         <span className="search-hint">⌘ K</span>
      </div>
      
      <div className="topbar-right">
         <div className="account-dropdown-wrapper">
            <button className="account-dropdown-btn" onClick={() => setAccountMenuOpen(!accountMenuOpen)}>
               <div className="account-avatar">A</div>
               <span className="account-label">Account</span>
               <span className="account-chev">▼</span>
            </button>
            {accountMenuOpen && (
              <>
                <div className="account-dropdown-overlay" onClick={() => setAccountMenuOpen(false)}></div>
                <div className="account-dropdown-menu">
                  <div className="account-dropdown-header">
                    <span className="account-dropdown-name">Account Settings</span>
                    <span className="account-dropdown-status">{backendStatus}</span>
                  </div>
                  <button className="account-dropdown-item" onClick={() => { setAccountMenuOpen(false); logout(); }}>Log out</button>
                </div>
              </>
            )}
         </div>
      </div>
    </header>
  );
}
