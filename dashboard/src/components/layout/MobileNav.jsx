import React, { useState } from 'react';
import { useAppState } from '../../hooks/useAppState';

const icons = { TODAY: '☀', ALL: '▦', UPCOMING: '↗', OVERDUE: '!', HIGH_PRIORITY: '◆', COMPLETED: '✓', CALENDAR: '□', SENDERS: '♙' };

export default function MobileNav() {
  const { currentView, setCurrentView, filter, setFilter } = useAppState();
  const [moreOpen, setMoreOpen] = useState(false);

  const go = (key) => {
    setCurrentView('TASKS');
    setFilter(key);
    setMoreOpen(false);
  };

  const goCalendar = () => {
    setCurrentView('CALENDAR');
    setMoreOpen(false);
  };

  const primaryItems = [
    { key: 'TODAY', label: 'Today', onClick: () => go('TODAY') },
    { key: 'ALL', label: 'All', onClick: () => go('ALL') },
    { key: 'UPCOMING', label: 'Upcoming', onClick: () => go('UPCOMING') },
    { key: 'CALENDAR', label: 'Calendar', onClick: goCalendar },
  ];

  const secondaryItems = [
    { key: 'OVERDUE', label: 'Overdue' },
    { key: 'HIGH_PRIORITY', label: 'Priority' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'SENDERS', label: 'Senders' },
  ];

  const getIsActive = (key) => {
    if (key === 'CALENDAR') return currentView === 'CALENDAR';
    return currentView === 'TASKS' && filter === key;
  };

  return (
    <div className="mobile-nav">
      {primaryItems.map(item => (
        <button key={item.key} className={`mobile-nav-item ${getIsActive(item.key) ? 'active' : ''}`} onClick={item.onClick}>
          <i>{icons[item.key] || '•'}</i>
          <span>{item.label}</span>
        </button>
      ))}
      <button className={`mobile-nav-item ${moreOpen ? 'active' : ''}`} onClick={() => setMoreOpen(!moreOpen)}>
        <i>≡</i>
        <span>More</span>
      </button>

      {moreOpen && (
        <div className="mobile-more-menu" onClick={(e) => e.stopPropagation()}>
          {secondaryItems.map(item => (
            <button key={item.key} className={`mobile-nav-item ${getIsActive(item.key) ? 'active' : ''}`} onClick={() => go(item.key)}>
              <i>{icons[item.key] || '•'}</i>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
