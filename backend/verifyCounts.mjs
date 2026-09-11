import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getUniqueTasks = (tasks) => {
    const getNormalizedString = (str) => (str || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const uniqueTasks = [];
    const seenOriginalMessages = new Set();
    const seenTitlesWithDeadlines = new Set();
    const seenIds = new Set();
    for (const t of tasks) {
      if (seenIds.has(t.id)) continue;
      const senderKey = t.senderKey || (t.sender || '').trim().replace(/\s*\(\d+\s*messages?\)/gi, '').toLowerCase().trim();
      const deadlineTime = t.deadline ? new Date(t.deadline).getTime() : 'no_deadline';
      const normMsg = t.originalMessage ? getNormalizedString(t.originalMessage) : '';
      const msgKey = normMsg ? `msg_${senderKey}_${normMsg}_${deadlineTime}` : null;
      const normTitle = t.task ? getNormalizedString(t.task) : '';
      const titleKey = normTitle ? `title_${senderKey}_${normTitle}_${deadlineTime}` : null;
      
      let isDuplicate = false;
      if (msgKey && seenOriginalMessages.has(msgKey)) isDuplicate = true;
      else if (titleKey && seenTitlesWithDeadlines.has(titleKey)) isDuplicate = true;
      
      if (!isDuplicate) {
        seenIds.add(t.id);
        if (msgKey) seenOriginalMessages.add(msgKey);
        if (titleKey) seenTitlesWithDeadlines.add(titleKey);
        uniqueTasks.push(t);
      }
    }
    return uniqueTasks;
};

async function verify() {
    const allTasks = await prisma.task.findMany();
    const targetSenderKey = 'gowtham.a';
    
    // Find all case variants if we want to log them out
    const myTasks = allTasks.filter(t => t.senderKey === targetSenderKey);
    const nonCompleted = myTasks.filter(t => t.status !== 'COMPLETED');
    
    const uniqueDisplaySenders = Array.from(new Set(myTasks.map(t => t.sender)));
    
    console.log(`sender/group tested: ${targetSenderKey} (Variants found: ${uniqueDisplaySenders.join(', ')} - if any)`);
    console.log(`raw task count: ${myTasks.length}`);
    
    const dedupedAll = getUniqueTasks(myTasks);
    // Deduplicated non-completed tasks (Sidebar Count)
    const dedupedNonCompleted = getUniqueTasks(nonCompleted);
    
    console.log(`deduplicated display-task count (overall): ${dedupedAll.length}`);
    console.log(`Sidebar count (deduplicated non-completed): ${dedupedNonCompleted.length}`);
    console.log(`visible task count after selecting group: ${dedupedNonCompleted.length}`);
}

verify().catch(console.error).finally(() => prisma.$disconnect());
