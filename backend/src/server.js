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
const activeProcessing = new Set();

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

      const deduplicationKey = `${source}-${sender}-${message}`;
      
      // 1. Race Condition Memory Lock
      if (activeProcessing.has(deduplicationKey)) {
          console.log(`\n⚠️ Duplicate message ignored - task already exists (active lock)`);
          return res.json({ success: true, message: 'Duplicate message ignored - task already exists', classification: null, task: null });
      }
      activeProcessing.add(deduplicationKey);

      // 2. Early Database Duplicate Check
      // Look back 5 minutes without constraining by status; allows preventing repeats of rapidly COMPLETED tasks.
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const duplicate = await prisma.task.findFirst({
          where: {
              sender,
              originalMessage: message,
              createdAt: { gte: fiveMinutesAgo }
          }
      });

          if (duplicate) {
              activeProcessing.delete(deduplicationKey);
              console.log(`\n⚠️ Duplicate message ignored - task already exists`);
              return res.json({
                  success: true,
                  message: 'Duplicate message ignored - task already exists',
                  classification: null,
                  task: duplicate
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
  "isImportant": boolean, // true if it contains a task, scheduled event, deadline, meeting, exam, appointment, or important info
  "isTask": boolean, // true if the message describes an actionable task OR any scheduled activity (e.g., exams, meetings, appointments, classes, events). Do not require imperative verbs (like "do", "submit"); declarative statements like "Flight exam tomorrow @10 in ALHC 304" MUST be classified as isTask: true. Casual info like "Tomorrow is a holiday" or "Marks were 10/20" is isTask: false.
  "category": "deadline" | "task" | "event" | "reminder" | "important_information" | "normal",
  "task": string | null, // the task or event title (e.g., "Flight exam in ALHC 304", "Team meeting"). Include the location in the title if present.
  "deadline": string | null, // ISO8601 string resolved logically against the reference time above. Evaluate relative offsets like "tomorrow at 10" strictly. Null if none present.
  "priority": "high" | "medium" | "low", // high if urgent/deadline/exam, low if normal
  "reason": string // brief explanation why you classified it this way
}

Do not invent tasks, times, or deadlines if they are not inferable.
Be lenient with casual chats (isImportant: false). 
Respond with JSON only.`;

              const completion = await groq.chat.completions.create({
                  messages: [{ role: "user", content: prompt }],
                  model: "openai/gpt-oss-20b"
              });

              let responseText = completion.choices[0]?.message?.content || "{}";
              if (responseText.includes("```json")) {
                  responseText = responseText.split("```json")[1].split("```")[0].trim();
              } else if (responseText.includes("```")) {
                  responseText = responseText.split("```")[1].trim();
              }
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
          // 3. Absolute Database Race Protection
          // A pure check-then-insert logic can fail if N>1 threads evaluate .findFirst() perfectly concurrently.
          // By wrapping the check-and-insert in a Prisma transaction paired with PostgreSQL's advisory locks,
          // we force horizontal replicas to queue linearly for this specific notification fingerprint dynamically!
          
          let hash = 0;
          const keyStr = `${sender}-${message}`;
          for (let i = 0; i < keyStr.length; i++) hash = ((hash << 5) - hash) + keyStr.charCodeAt(i) | 0;
          const lockKey = hash; // 32-bit collision-resistant footprint

          try {
              finalTask = await prisma.$transaction(async (tx) => {
                  // Wait sequentially ensuring all replicas pause if one is currently transacting this exact hash
                  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(1, ${lockKey})`);
                  
                  const crossReplicaDuplicate = await tx.task.findFirst({
                      where: {
                          sender,
                          originalMessage: message,
                          createdAt: { gte: fiveMinutesAgo }
                      }
                  });

                  if (crossReplicaDuplicate) {
                      console.log(`\n⚠️ Database race blocked successfully! Concurrent replica bypassed.`);
                      return crossReplicaDuplicate;
                  }

                  const newTask = await tx.task.create({
                      data: {
                          source,
                          sender,
                          originalMessage: message,
                          task: aiResult.task || null,
                          category: aiResult.category || 'important_information',
                          priority: (aiResult.priority || 'MEDIUM').toUpperCase(),
                          deadline: aiResult.deadline ? new Date(aiResult.deadline) : null,
                          status: 'PENDING',
                          createdAt: new Date(),
                          receivedAt: receivedAt ? new Date(receivedAt) : null,
                          reminderSent: false
                      }
                  });
                  return newTask;
              });

              if (finalTask.status !== 'PENDING' && finalTask.createdAt < new Date(Date.now() - 1000)) {
                   // This was a returned duplicate from inside the transaction
              } else {
                  console.log(`\n✅ Task created\nTask ID: ${finalTask.id}\nStatus: ${finalTask.status}`);
              }
          } catch(err) {
              console.error(`\n⚠️ Transaction fault allocating atomic write`, err.message);
          }
      } else {
          console.log(`\nℹ️ No task created`);
      }

      activeProcessing.delete(deduplicationKey);

      res.json({
        success: true,
        message: (finalTask && finalTask.createdAt > new Date(Date.now() - 2000)) ? 'Message processed and task created' : 'Message processed',
        classification: aiResult,
        task: finalTask
      });
  } catch (err) {
      if (req.body && req.body.source) {
          const { source, sender, message } = req.body;
          activeProcessing.delete(`${source}-${sender}-${message}`);
      }
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
