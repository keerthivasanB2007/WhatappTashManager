require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log("Fetching all tasks for backfill...");
    const tasks = await prisma.task.findMany({ select: { id: true, sender: true, senderKey: true } });
    
    // Existing backend normalizer logic matching the new server.js implementation
    const normalizeSender = (s) => {
        if (!s) return null;
        let cleaned = s.trim().replace(/\s*\(\d+\s*messages?\)/gi, '').trim();
        if (cleaned.includes(':')) {
            cleaned = cleaned.split(':')[0].trim();
        }
        return cleaned.toLowerCase();
    };

    const beforeGroups = new Set();
    const afterGroups = new Set();
    let updatedCount = 0;

    for (const t of tasks) {
        if (t.senderKey) beforeGroups.add(t.senderKey);
        else if (t.sender) beforeGroups.add(t.sender.toLowerCase().trim());
        
        let newKey = null;
        if (t.sender) {
            newKey = normalizeSender(t.sender);
            afterGroups.add(newKey);
        }

        // Check if the current DB key is inaccurate versus newly generated
        if (t.senderKey !== newKey) {
            await prisma.task.update({
                where: { id: t.id },
                data: { senderKey: newKey }
            });
            updatedCount++;
        }
    }

    console.log("\n=== BACKFILL COMPLETE ===");
    console.log(`Total Tasks Processed: ${tasks.length}`);
    console.log(`Rows Updated with new senderKey: ${updatedCount}`);
    console.log(`Distinct Sender Groups (BEFORE): ${beforeGroups.size}`);
    console.log(`Distinct Sender Groups (AFTER): ${afterGroups.size}`);
}

run()
.catch(console.error)
.finally(() => prisma.$disconnect());
