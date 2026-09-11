const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log("Starting tenancy migration...");
  
  // 1. Check for default admin user or create one
  const email = 'admin@whatsapptaskmanager.local';
  let adminUser = await prisma.user.findUnique({ where: { email } });
  
  if (!adminUser) {
    console.log("Creating default admin user...");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin', salt);
    adminUser = await prisma.user.create({
      data: {
        email,
        passwordHash
      }
    });
    console.log("Created admin user with ID:", adminUser.id);
  } else {
    console.log("Admin user already exists with ID:", adminUser.id);
  }

  // 2. Backfill existing tasks that have no userId
  console.log("Backfilling orphaned tasks to admin user...");
  const updateResult = await prisma.task.updateMany({
    where: {
      userId: null
    },
    data: {
      userId: adminUser.id
    }
  });
  
  console.log(`Successfully migrated ${updateResult.count} tasks.`);
}

main()
  .catch(e => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
