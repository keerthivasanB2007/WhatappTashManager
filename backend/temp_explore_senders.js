require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function run() {
  const tasks = await prisma.task.findMany({ select: { sender: true, senderKey: true } });
  
  const senders = {};
  for (const t of tasks) {
    if (!senders[t.sender]) senders[t.sender] = 0;
    senders[t.sender]++;
  }

  const result = { specificGroups: [], allFragments: [] };

  for (const s of Object.keys(senders)) {
    if (s.toLowerCase().includes('kurinji') || s.toLowerCase().includes('act') || s.toLowerCase().includes('cse')) {
      result.specificGroups.push({ sender: s, count: senders[s] });
    }
    if (s.includes('~') || s.includes(':') || s.includes('-') || s.includes('_')) {
      result.allFragments.push({ sender: s, count: senders[s] });
    }
  }
  
  fs.writeFileSync('senders_output.json', JSON.stringify(result, null, 2));
}
run().then(() => console.log("Done")).catch(console.error).finally(() => prisma.$disconnect());
