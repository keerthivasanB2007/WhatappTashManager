require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
    console.log("Fetching all tasks via Neon HTTP...");
    const tasks = await sql`SELECT id, sender, "senderKey" FROM "Task"`;
    
    const normalizeSender = (s) => {
        if (!s) return null;
        let cleaned = s.trim().replace(/\s*\(\d+\s*messages?\)/gi, '').trim();
        if (cleaned.includes(':')) {
            cleaned = cleaned.split(':')[0].trim();
        }
        return cleaned.toLowerCase();
    };

    const beforeGroups = new Set();
    const afterGroups = new Set();
    let updatedCount = 0;
    
    // To satisfy requirement: verify output for the specific 3 groups
    const trackingGroupsTarget = ["cse_2024-2028", "act 26-27", "3rd year kurinji and marutham"];
    const collapsedMap = {};

    for (const t of tasks) {
        if (t.senderKey) beforeGroups.add(t.senderKey);
        else if (t.sender) beforeGroups.add(t.sender.toLowerCase().trim());
        
        let newKey = null;
        if (t.sender) {
            newKey = normalizeSender(t.sender);
            afterGroups.add(newKey);
            
            if (trackingGroupsTarget.includes(newKey)) {
                if (!collapsedMap[newKey]) collapsedMap[newKey] = new Set();
                collapsedMap[newKey].add(t.sender);
            }
        }

        if (t.senderKey !== newKey) {
            // Update using Neon HTTP
            await sql`UPDATE "Task" SET "senderKey" = ${newKey} WHERE id = ${t.id}`;
            updatedCount++;
        }
    }

    console.log("\n=== BACKFILL COMPLETE ===");
    console.log(`Total Tasks Processed: ${tasks.length}`);
    console.log(`Rows Updated with new senderKey: ${updatedCount}`);
    console.log(`Distinct Sender Groups (BEFORE): ${beforeGroups.size}`);
    console.log(`Distinct Sender Groups (AFTER): ${afterGroups.size}`);

    console.log("\n=== SPECIFIC GROUPS VERIFICATION ===");
    for (const [key, rawSet] of Object.entries(collapsedMap)) {
        console.log(`\nGroup [ ${key} ] successfully dynamically merged these variants:`);
        for (const raw of rawSet) {
             console.log(`  - ${raw}`);
        }
    }
}

run()
.then(() => console.log("\nFinished successfully."))
.catch(console.error);
