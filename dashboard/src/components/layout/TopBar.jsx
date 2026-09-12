import React, { useEffect, useRef, useState } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useAuth } from '../../hooks/useAuth';

export default function TopBar() {
  const { searchQuery, setSearchQuery, setRailHidden, railHidden } = useAppState();
  const { logout } = useAuth();
  const input = useRef();
  const profile = useRef();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const keys = event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); input.current?.focus(); } if (event.key === 'Escape') setMenuOpen(false); };
    const outside = event => { if (!profile.current?.contains(event.target)) setMenuOpen(false); };
    window.addEventListener('keydown', keys); document.addEventListener('mousedown', outside);
    return () => { window.removeEventListener('keydown', keys); document.removeEventListener('mousedown', outside); };
  }, []);
  return <header className="global-topbar"><div className="crumb"><strong className="crumb-brand">Chat2Task</strong></div><label className="global-search"><span>⌕</span><input ref={input} value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search tasks, messages, or senders"/><kbd>Ctrl K</kbd></label><div className="top-actions"><button title="Toggle insights" className="top-action" onClick={() => setRailHidden(!railHidden)}>▤</button><div className="profile-menu" ref={profile}><button className="profile-trigger" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen}><span className="avatar">K</span><span className="profile-name">Keerthivasan</span><span className="profile-caret">⌄</span></button>{menuOpen && <div className="profile-popover"><div className="profile-popover-head"><span className="avatar">K</span><div><strong>Keerthivasan</strong><small>Chat2Task</small></div></div><button className="logout-option" onClick={logout}>Log out <span>→</span></button></div>}</div></div></header>;
}
