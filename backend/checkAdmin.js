const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const comUser = await prisma.user.findUnique({ where: { email: 'admin@whatsapptaskmanager.com' } });
    console.log("admin@whatsapptaskmanager.com EXISTS:", comUser ? "YES" : "NO");
}
main().finally(() => prisma.$disconnect());
