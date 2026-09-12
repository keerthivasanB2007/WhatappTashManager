require('dotenv').config();
const Groq = require('groq-sdk');

async function runTests() {
    if (!process.env.GROQ_API_KEY) {
        console.error('No GROQ_API_KEY available to run tests.');
        return;
    }
    
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const referenceTime = "2026-09-12T19:16:00+05:30";
    const sender = "Test Sender";
    
    const cases = [
        "Complete network assignment by today",
        "Submit assignment tomorrow",
        "Submit assignment by today at 9 PM",
        "Submit assignment on September 15 at 10 AM",
        "Please check the assignment"
    ];

    for (let i = 0; i < cases.length; i++) {
        const message = cases[i];
        
        const prompt = `
You are an AI assistant analyzing a WhatsApp message.
Reference time: ${referenceTime} (This includes the user's localized timezone offset).

Message from ${sender}:
"${message}"

Extract the following information and return ONLY valid JSON matching this structure:
{
  "isImportant": boolean, // true if it contains a task, scheduled event, deadline, meeting, exam, appointment, or important info
  "isTask": boolean, // true if it describes an actionable task OR scheduled activity.
  "category": "deadline" | "task" | "event" | "reminder" | "important_information" | "normal",
  "task": string | null, // the task or event title.
  "deadline": string | null, // ISO8601 string logically resolved against Reference time IN ITS EXACT TIMEZONE OFFSET. Rules: 'today' = local calendar date of reference. 'by today' = end of that local day (23:59:59). 'tomorrow' = next local calendar day. 'tonight' = current local evening. DO NOT use UTC math when computing relative shifts if it jumps standard calendar date boundaries. Null if none present.
  "priority": "high" | "medium" | "low", // high if urgent/deadline/exam, low if normal
  "reason": string // brief explanation why you classified it this way
}

Do not invent tasks, times, or deadlines if they are not inferable.
Be lenient with casual chats (isImportant: false). 
Respond with JSON only.`;

        try {
            console.log(`\nTEST ${i + 1}: ${message}`);
            // Use same model from server.js
            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],

                // Replace openai/gpt-oss-20b with standard llama model since original was a proxy or wrapper mapping, using llama-3.1-70b-versatile
                model: "llama-3.1-8b-instant" 
            });
            let responseText = completion.choices[0]?.message?.content || "{}";
            if (responseText.includes("\`\`\`json")) {
                responseText = responseText.split("\`\`\`json")[1].split("\`\`\`")[0].trim();
            } else if (responseText.includes("\`\`\`")) {
                responseText = responseText.split("\`\`\`")[1].trim();
            }
            
            const parsed = JSON.parse(responseText);
            console.log(`Deadline: ${parsed.deadline}`);
        } catch (e) {
            console.error(`Error on test ${i+1}:`, e.message);
        }
    }
}

runTests();
