const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const tasksFile = path.join(__dirname, '..', 'data', 'tasks.json');

async function migrate() {
    console.log("=== PHASE 5: Data Migration ===");
    try {
        const data = fs.readFileSync(tasksFile, 'utf-8');
        const tasks = JSON.parse(data);
        let success = 0;
        let failed = 0;
        let duplicates = 0;

        for (const t of tasks) {
            try {
                // Check duplicate ID
                const existing = await prisma.task.findUnique({ where: { id: t.id }});
                if (existing) {
                    duplicates++;
                    continue;
                }
                
                await prisma.task.create({
                    data: {
                        id: t.id,
                        source: t.source || 'whatsapp',
                        sender: t.sender || 'Unknown',
                        originalMessage: t.originalMessage || '',
                        task: t.task || null,
                        category: t.category || 'important_information',
                        priority: t.priority || 'MEDIUM',
                        deadline: t.deadline ? new Date(t.deadline) : null,
                        status: t.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
                        createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
                        receivedAt: t.receivedAt ? new Date(t.receivedAt) : null,
                        reminderSent: !!t.reminderSent
                    }
                });
                success++;
            } catch (err) {
                failed++;
                console.error(`Failed to insert task: ${t.id}`, err.message);
            }
        }

        const totalInDb = await prisma.task.count();
        console.log(`JSON Records: ${tasks.length} | DB Records: ${totalInDb}`);
        console.log(`Success: ${success} | Duplicates: ${duplicates} | Failed: ${failed}`);
        
    } catch (err) {
        console.error("Migration fatal error:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}
migrate();
