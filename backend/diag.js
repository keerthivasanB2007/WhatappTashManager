const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  try {
    const users = await prisma.user.findMany();
    const tasks = await prisma.task.findMany();
    
    console.log("=== DB DUMP ===");
    let authUser = null;
    users.forEach(u => {
      const c = tasks.filter(t => t.userId === u.id).length;
      console.log(`User: ${u.name} | ${u.email} | ${u.id} | Tasks: ${c}`);
      if (u.name.toLowerCase().includes('keer')) authUser = u;
      if (!authUser && u.email.includes('admin')) authUser = u;
    });

    console.log("AUTH USER:", authUser ? authUser.id : "None found");
    
    if (authUser) {
      const apiTasks = await prisma.task.findMany({ where: { userId: authUser.id }});
      console.log("TASK COUNT FROM API:", apiTasks.length);
      console.log("RESPONSE: [{ \"success\": true, \"count\": " + apiTasks.length + ", \"tasks\": [...] }]");
    }
  } catch(e) {
    console.log("STATUS: 500");
    console.log("RESPONSE: " + e.message);
  } finally {
    await prisma.$disconnect();
  }
}
diagnose();
