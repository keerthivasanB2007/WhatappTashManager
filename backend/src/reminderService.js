const taskStore = require('./taskStore');

async function getEligibleReminders() {
    const tasks = await taskStore.getTasks();
    const now = Date.now();
    const reminders = [];

    for (const task of tasks) {
        if (task.status !== 'PENDING') continue;
        if (task.reminderSent) continue;
        if (!task.deadline) continue;

        const dTime = new Date(task.deadline).getTime();
        if (isNaN(dTime)) continue; 

        let offsetHours = 2; // MEDIUM
        if (task.priority === 'HIGH') offsetHours = 1;
        else if (task.priority === 'LOW') offsetHours = 3;

        const reminderTime = dTime - (offsetHours * 60 * 60 * 1000);

        if (now >= reminderTime) {
            reminders.push({
                taskId: task.id,
                title: task.task || task.originalMessage.substring(0, 50),
                deadline: task.deadline,
                priority: task.priority,
                message: `Your task is due soon`
            });
        }
    }
    return reminders;
}

module.exports = {
    getEligibleReminders
};
