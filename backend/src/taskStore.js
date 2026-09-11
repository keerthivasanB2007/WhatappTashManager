const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getTasks(userId) {
    try {
        return await prisma.task.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    } catch(err) {
        console.error("Database connection failure:", err.message);
        throw err;
    }
}

async function getTaskById(id, userId) {
    try {
        return await prisma.task.findFirst({ where: { id, userId } });
    } catch(err) {
        return null;
    }
}

async function createTask(userId, taskData) {
    const newTask = await prisma.task.create({
        data: {
            userId: userId,
            source: taskData.source,
            sender: taskData.sender,
            senderKey: taskData.senderKey || null,
            originalMessage: taskData.originalMessage,
            task: taskData.task || null,
            category: taskData.category || 'important_information',
            priority: taskData.priority ? taskData.priority.toUpperCase() : 'MEDIUM',
            deadline: taskData.deadline ? new Date(taskData.deadline) : null,
            status: 'PENDING',
            createdAt: new Date(),
            receivedAt: taskData.receivedAt ? new Date(taskData.receivedAt) : null,
            reminderSent: false
        }
    });
    return newTask;
}

async function updateTask(id, userId, updates) {
    delete updates.id;
    delete updates.originalMessage;
    delete updates.sender;
    delete updates.source;
    delete updates.userId;

    try {
        const updated = await prisma.task.updateMany({
            where: { id, userId },
            data: updates
        });
        if (updated.count === 0) return null;
        return await prisma.task.findFirst({ where: { id, userId } });
    } catch(err) {
        return null;
    }
}

async function deleteTask(id, userId) {
    try {
        const result = await prisma.task.deleteMany({ where: { id, userId } });
        return result.count > 0;
    } catch(err) {
        return false;
    }
}

module.exports = {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask
};
