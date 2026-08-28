require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setup() {
    console.log("=== INITIAL USER SETUP ===");
    const email = process.env.SETUP_EMAIL;
    const password = process.env.SETUP_PASSWORD;

    if (!email || !password) {
        console.error("SETUP_EMAIL and SETUP_PASSWORD must be provided in .env");
        process.exit(1);
    }

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            console.log("User already exists. Safely skipping setup.");
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await prisma.user.create({
            data: { email, passwordHash }
        });

        console.log("✅ Initial Admin user securely registered!");
    } catch(err) {
        console.error("Fatal exception during setup:", err.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}
setup();
