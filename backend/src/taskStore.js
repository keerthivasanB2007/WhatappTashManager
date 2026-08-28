const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getTasks() {
    try {
        return await prisma.task.findMany({
            orderBy: { createdAt: 'desc' }
        });
    } catch(err) {
        console.error("Database connection failure:", err.message);
        return [];
    }
}

async function getTaskById(id) {
    try {
        return await prisma.task.findUnique({ where: { id } });
    } catch(err) {
        return null;
    }
}

async function createTask(taskData) {
    const newTask = await prisma.task.create({
        data: {
            source: taskData.source,
            sender: taskData.sender,
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

async function updateTask(id, updates) {
    delete updates.id;
    delete updates.originalMessage;
    delete updates.sender;
    delete updates.source;

    try {
        const updated = await prisma.task.update({
            where: { id },
            data: updates
        });
        return updated;
    } catch(err) {
        return null;
    }
}

async function deleteTask(id) {
    try {
        await prisma.task.delete({ where: { id } });
        return true;
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
