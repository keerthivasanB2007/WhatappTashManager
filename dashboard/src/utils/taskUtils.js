export const getTaskCategory = (task) => {
    if (!task.deadline) return 'NO_DEADLINE';
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTomorrow = startOfToday + 86400000;
    const startOfDayAfter = startOfTomorrow + 86400000;

    const d = new Date(task.deadline).getTime();
    if (isNaN(d)) return 'NO_DEADLINE'; 

    if (d < startOfToday) return 'OVERDUE';
    if (d >= startOfToday && d < startOfTomorrow) return 'TODAY';
    if (d >= startOfTomorrow && d < startOfDayAfter) return 'TOMORROW';
    
    const startOfNextWeek = startOfToday + (7 * 86400000); 
    if (d >= startOfDayAfter && d < startOfNextWeek) return 'THIS_WEEK';
    
    return 'LATER';
};

export const formatDate = (dateStr) => {
    if (!dateStr) return 'No deadline';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'No deadline' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const extractUrl = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : null;
};

export const getUniqueTasks = (tasks) => {
    const getNormalizedString = (str) => (str || '').trim().replace(/\s+/g, ' ').toLowerCase();

    // Prioritize COMPLETED tasks during deduplication discovery
    // This allows the completed state to claim ownership of the deduplication key,
    // safely shadowing identical PENDING duplicates.
    const sortedTasks = [...tasks].sort((a, b) => {
      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return -1;
      if (b.status === 'COMPLETED' && a.status !== 'COMPLETED') return 1;
      return 0; // retain original order for other cases
    });

    const uniqueTasks = [];
    const seenOriginalMessages = new Set();
    const seenTitlesWithDeadlines = new Set();
    const discoveredIds = new Set();

    for (const t of sortedTasks) {
      if (discoveredIds.has(t.id)) continue;
      
      const senderKey = t.senderKey || (t.sender || '').trim().replace(/\s*\(\d+\s*messages?\)/gi, '').toLowerCase().trim();
      const deadlineTime = t.deadline ? new Date(t.deadline).getTime() : 'no_deadline';
      
      const normMsg = t.originalMessage ? getNormalizedString(t.originalMessage) : '';
      const msgKey = normMsg ? `msg_${senderKey}_${normMsg}_${deadlineTime}` : null;
      
      const normTitle = t.task ? getNormalizedString(t.task) : '';
      const titleKey = normTitle ? `title_${senderKey}_${normTitle}_${deadlineTime}` : null;
      
      let isDuplicate = false;
      
      if (msgKey && seenOriginalMessages.has(msgKey)) {
        isDuplicate = true;
      } else if (titleKey && seenTitlesWithDeadlines.has(titleKey)) {
        isDuplicate = true;
      }
      
      if (!isDuplicate) {
        discoveredIds.add(t.id);
        if (msgKey) seenOriginalMessages.add(msgKey);
        if (titleKey) seenTitlesWithDeadlines.add(titleKey);
        uniqueTasks.push(t);
      }
    }
    
    // Return original tasks array filtered by chosen unique IDs strictly to preserve original sequence ordering.
    return tasks.filter(t => discoveredIds.has(t.id));
};
