import React, { useState } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useAuth } from '../../hooks/useAuth';

export default function TopBar() {
  const { searchQuery, setSearchQuery, sidebarOpen, setSidebarOpen, backendStatus } = useAppState();
  const { logout } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const searchInputRef = React.useRef(null);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
       if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          searchInputRef.current?.focus();
       }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="global-topbar">
      <div className="topbar-left">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className="topbar-logo-group">
            <div className="topbar-logo">
               <span className="logo-icon-neon"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .16 5.333.158 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.332 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg></span>
               <span className="logo-text">WhatsApp<span>TaskManager</span></span>
            </div>
            <div className="topbar-subtitle">Capture · Organize · Never Miss</div>
          </div>
      </div>
      
      <div className="search-input-wrapper">
         <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
         <input type="text" ref={searchInputRef} className="search-input" placeholder="Search tasks, messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
         <span className="search-hint">⌘ K</span>
      </div>
      
      <div className="topbar-right">
         <button className="topbar-icon-btn notification-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span className="notification-dot"></span>
         </button>
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
         <button className="topbar-icon-btn theme-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
         </button>
      </div>
    </header>
  );
}
