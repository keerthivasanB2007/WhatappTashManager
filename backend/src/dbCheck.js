require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const totalCount = await prisma.task.count();
    const nullCount = await prisma.task.count({ where: { senderKey: null } });
    console.log(`TOTAL_ROWS: ${totalCount}`);
    console.log(`NULL_SENDER_KEY_ROWS: ${nullCount}`);

    if (nullCount > 0) {
        console.log("WAIT! There are still NULL rows.");
    } else {
        console.log("SAFE to make NOT NULL.");
    }
}
check().catch(console.error).finally(() => prisma.$disconnect());
