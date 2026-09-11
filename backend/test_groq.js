require('dotenv').config();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function run() {
    try {
        const receivedAt = '2026-08-29T10:00:00.000Z';
        const sender = 'Friend';
        const message = 'Flight exam @10 tomorrow in ALHC 304';
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

        console.log('Sending...');
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.1-8b-instant',
            response_format: { type: 'json_object' }
        });
        
        console.log('RAW JSON:', completion.choices[0]?.message?.content);
    } catch(err) {
        console.error('Error:', err);
    }
}
run();
