require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const Groq = require('groq-sdk');
const taskStore = require('./taskStore');
const reminderService = require('./reminderService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (process.env.DASHBOARD_ORIGIN && process.env.DASHBOARD_ORIGIN === origin) {
            return callback(null, true);
        }

        if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
    }
};

app.use(cors(corsOptions));
app.use(express.json());

// Decoupled architecture natively targeting distributed cloud origins.

// Initialize Groq
let groq = null;
if (process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} else {
    console.warn("WARNING: GROQ_API_KEY is not set in .env");
}

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(401).json({ success: false, message: 'Invalid or Expired Token' });
        req.user = user;
        next();
    });
};

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
        
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ success: false, message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await prisma.user.create({
            data: { email, passwordHash }
        });

        res.json({ success: true, message: 'User registered successfully' });
    } catch(err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const validPass = await bcrypt.compare(password, user.passwordHash);
        if (!validPass) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token });
    } catch(err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// Messages endpoint
app.post('/api/messages', async (req, res) => {
  try {
      const { source, sender, message, receivedAt } = req.body;

      if (!source || !sender || !message || !receivedAt) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: source, sender, message, receivedAt'
        });
      }

      let aiResult = null;

      if (process.env.GROQ_API_KEY) {
          try {
              const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
              const prompt = `
You are an AI assistant analyzing a WhatsApp message.
Reference time: ${receivedAt}

Message from ${sender}:
"${message}"

Extract the following information and return ONLY valid JSON matching this structure:
{
  "isImportant": boolean, // true if it contains a task, deadline, event, reminder, or important info
  "isTask": boolean, // true if there is an actionable task
  "category": "deadline" | "task" | "event" | "reminder" | "important_information" | "normal",
  "task": string | null, // the task extracted, null if not a task
  "deadline": string | null, // ISO8601 string resolved based on the reference time above, or null
  "priority": "high" | "medium" | "low", // high if urgent/deadline, low if normal
  "reason": string // brief explanation why you classified it this way
}

Do not invent tasks or deadlines if they are not present or inferable.
Be lenient with casual chats (isImportant: false). 
Respond with JSON only.`;

              const completion = await groq.chat.completions.create({
                  messages: [{ role: "user", content: prompt }],
                  model: "openai/gpt-oss-20b"
              });

              let responseText = completion.choices[0]?.message?.content || "{}";
              // Safety fallback: stip out markdown code blocks if the bot uses them
              if (responseText.includes("```json")) {
                  responseText = responseText.split("```json")[1].split("```")[0].trim();
              } else if (responseText.includes("```")) {
                  responseText = responseText.split("```")[1].trim();
              }
              console.log("Raw AI Response:", responseText);
              aiResult = JSON.parse(responseText);
          } catch (error) {
              console.error("Groq AI Processing Error:", error.message);
              aiResult = { error: error.message };
          }
      }

      console.log(`\n📨 Message received
Source: ${source}
Sender: ${sender}
Message: ${message}
ReceivedAt: ${receivedAt}`);
      
      if (aiResult) {
          console.log(`\n🤖 Groq classification:
Important: ${aiResult.isImportant}
Task: ${aiResult.isTask}`);
          if (aiResult.isTask) {
              console.log(`Category: ${aiResult.category}`);
              if (aiResult.task) console.log(`Extracted Task: ${aiResult.task}`);
              if (aiResult.deadline) console.log(`Deadline: ${aiResult.deadline}`);
              console.log(`Priority: ${aiResult.priority}`);
          }
      }

      let finalTask = null;

      if (aiResult && aiResult.isTask) {
          // Duplicate protection
          const tasks = await taskStore.getTasks();
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          const duplicate = tasks.find(t => 
              t.status === 'PENDING' && 
              t.sender === sender && 
              t.originalMessage === message && 
              new Date(t.createdAt) > fiveMinutesAgo
          );

          if (duplicate) {
              console.log(`\n⚠️ Duplicate task detected. Returning existing.`);
              finalTask = duplicate;
          } else {
              finalTask = await taskStore.createTask({
                  source,
                  sender,
                  originalMessage: message,
                  task: aiResult.task || null,
                  category: aiResult.category || 'important_information',
                  priority: (aiResult.priority || 'MEDIUM').toUpperCase(),
                  deadline: aiResult.deadline || null,
                  receivedAt
              });
              console.log(`\n✅ Task created
Task ID: ${finalTask.id}
Status: ${finalTask.status}`);
          }
      } else {
          console.log(`\nℹ️ No task created`);
      }

      res.json({
        success: true,
        message: finalTask ? 'Message processed and task created' : 'Message processed',
        classification: aiResult,
        task: finalTask
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// GET /api/tasks
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        let tasks = await taskStore.getTasks();
        const { status, priority, category, sort } = req.query;

        if (status) tasks = tasks.filter(t => t.status === status);
        if (priority) tasks = tasks.filter(t => t.priority === priority.toUpperCase());
        if (category) tasks = tasks.filter(t => t.category === category);

        if (sort === 'createdAt') {
            tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sort === 'deadline') {
            tasks.sort((a, b) => {
                if (!a.deadline && !b.deadline) return 0;
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline) - new Date(b.deadline);
            });
        }

        res.json({ success: true, count: tasks.length, tasks });
    } catch(err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// GET /api/tasks/:id
app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const task = await taskStore.getTaskById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        res.json({ success: true, task });
    } catch(err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// PATCH /api/tasks/:id
app.patch('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid request body' });
        }

        const { status } = req.body;
        if (status !== 'PENDING' && status !== 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'Invalid status. Use PENDING or COMPLETED.' });
        }

        const updatedTask = await taskStore.updateTask(req.params.id, { status });
        if (!updatedTask) return res.status(404).json({ success: false, message: 'Task not found' });
        res.json({ success: true, message: 'Task updated', task: updatedTask });
    } catch(err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const success = await taskStore.deleteTask(req.params.id);
        if (!success) return res.status(404).json({ success: false, message: 'Task not found' });
        res.json({ success: true, message: 'Task deleted' });
    } catch(err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// GET /api/reminders
app.get('/api/reminders', async (req, res) => {
    try {
        const reminders = await reminderService.getEligibleReminders();
        res.json({ success: true, count: reminders.length, reminders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST /api/reminders/:taskId/sent
app.post('/api/reminders/:taskId/sent', async (req, res) => {
    try {
        const task = await taskStore.getTaskById(req.params.taskId);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        if (task.status === 'COMPLETED') return res.status(400).json({ success: false, message: 'Task is already completed' });
        
        const updatedTask = await taskStore.updateTask(req.params.taskId, { reminderSent: true });
        res.json({ success: true, message: 'Reminder marked as sent', task: updatedTask });
    } catch(err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// Root fallback
app.get('/', (req, res) => {
    res.json({ message: "WhatsAppTaskManager API backend operational" });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on 0.0.0.0:${PORT}`);
});
