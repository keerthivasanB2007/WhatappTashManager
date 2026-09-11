const API_URL = 'https://whatapptashmanager-api.onrender.com';

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
}

async function runTests() {
    try {
        console.log("STEP 1: Health Check");
        const health = await fetchJSON(`${API_URL}/health`);
        console.log("Health:", health);
    } catch(e) { console.error("Health Check failed", e.message); }

    try {
        console.log("\nSTEP 2: Task Creation E2E & Duplicate check");
        const p1 = {
            source: "whatsapp", sender: "Phase12_User", 
            message: "Submit the NDC assignment before 10th September", 
            receivedAt: new Date().toISOString()
        };
        const r1 = await fetchJSON(`${API_URL}/api/messages`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p1)
        });
        console.log("Task 1:", r1.message, "Extracted:", r1.task?.task, r1.task?.id);

        const r2 = await fetchJSON(`${API_URL}/api/messages`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p1)
        });
        console.log("Task 2 (Duplicate):", r2.message, "Returned Task ID:", r2.task?.id);
    } catch(e) { console.error("Step 2 failed", e.message); }

    try {
        console.log("\nSTEP 3: Casual Message Test");
        const p2 = {
            source: "whatsapp", sender: "Phase12_Bob", 
            message: "Hey bro, what are you doing?", 
            receivedAt: new Date().toISOString()
        };
        const r3 = await fetchJSON(`${API_URL}/api/messages`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p2)
        });
        console.log("Casual:", r3.message, "IsTask:", r3.classification?.isTask);
    } catch(e) { console.error("Step 3 failed", e.message); }

    try {
        console.log("\nSTEP 4: Important Non-Task Test");
        const p3 = {
            source: "whatsapp", sender: "Phase12_Charlie", 
            message: "Flight exam @10 tomorrow in ALHC 304", 
            receivedAt: new Date().toISOString()
        };
        const r4 = await fetchJSON(`${API_URL}/api/messages`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p3)
        });
        console.log("Non-Task Important:", r4.message, "IsTask:", r4.classification?.isTask, "IsImportant:", r4.classification?.isImportant, r4.task?.task);
    } catch(e) { console.error("Step 4 failed", e.message); }
}

runTests().catch(console.error);
