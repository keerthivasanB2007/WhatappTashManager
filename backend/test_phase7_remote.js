const BASE_URL = 'https://whatapptashmanager-api.onrender.com';

async function runTests() {
  console.log(`\n============================\nSTARTING PHASE 7 TESTS\n============================`);
  let allPassed = true;

  try {
    // Test 1
    console.log(`\n[Test 1] Health Endpoint`);
    const hRes = await fetch(`${BASE_URL}/health`);
    const hData = await hRes.json();
    if(hData.status === 'ok') console.log(`✅ Passed: Health check OK (${hRes.status})`);
    else { console.log(`❌ Failed: Health check returned ${JSON.stringify(hData)}`); allPassed = false; }

    const now = new Date().toISOString();

    // Test 2
    console.log(`\n[Test 2] Task creation: "Submit the NDC assignment before 10th September"`);
    const p1 = { source: 'com.whatsapp', sender: 'Phase7 User', message: 'Submit the NDC assignment before 10th September', receivedAt: now };
    const res2 = await fetch(`${BASE_URL}/api/messages`, { method: 'POST', headers: { 'Content-Type':'application/json'}, body: JSON.stringify(p1) });
    const data2 = await res2.json();
    if(data2.success && data2.classification?.isTask === true && data2.task && data2.task.id) {
       console.log(`✅ Passed: Task created properly. ID: ${data2.task.id}, Priority: ${data2.task.priority}, Deadline: ${data2.task.deadline}`);
    } else {
       console.log(`❌ Failed: ${JSON.stringify(data2)}`); allPassed = false;
    }

    // Test 3
    console.log(`\n[Test 3] Duplicate Task prevention (same payload)`);
    const res3 = await fetch(`${BASE_URL}/api/messages`, { method: 'POST', headers: { 'Content-Type':'application/json'}, body: JSON.stringify(p1) });
    const data3 = await res3.json();
    if(data3.message.includes('Duplicate') && data3.task) {
       console.log(`✅ Passed: Duplicate prevented intelligently (${data3.message})`);
    } else {
       console.log(`❌ Failed: Expected duplicate drop but got ${JSON.stringify(data3)}`); allPassed = false;
    }

    // Test 4
    console.log(`\n[Test 4] Casual Message`);
    const p4 = { source: 'com.whatsapp', sender: 'Phase7 User', message: 'Hey bro, what are you doing?', receivedAt: new Date().toISOString() };
    const res4 = await fetch(`${BASE_URL}/api/messages`, { method: 'POST', headers: { 'Content-Type':'application/json'}, body: JSON.stringify(p4) });
    const data4 = await res4.json();
    if(!data4.classification?.isTask && !data4.task) {
       console.log(`✅ Passed: Casual message ignored softly`);
    } else {
       console.log(`❌ Failed: Expected casual drop but got ${JSON.stringify(data4)}`); allPassed = false;
    }

    // Test 5
    console.log(`\n[Test 5] WhatsApp Summary (4 new messages)`);
    const p5 = { source: 'com.whatsapp', sender: 'WhatsApp', message: '4 new messages', receivedAt: new Date().toISOString() };
    const res5 = await fetch(`${BASE_URL}/api/messages`, { method: 'POST', headers: { 'Content-Type':'application/json'}, body: JSON.stringify(p5) });
    const data5 = await res5.json();
    if(!data5.classification?.isTask && !data5.task) {
       console.log(`✅ Passed: Summary ignored softly`);
    } else {
       console.log(`❌ Failed: Expected summary drop but got ${JSON.stringify(data5)}`); allPassed = false;
    }
    
    // Test 6
    console.log(`\n[Test 6] Important declarative non-verb task`);
    const p6 = { source: 'com.whatsapp', sender: 'Phase7 User', message: 'Flight exam @10 tomorrow in ALHC 304', receivedAt: new Date().toISOString() };
    const res6 = await fetch(`${BASE_URL}/api/messages`, { method: 'POST', headers: { 'Content-Type':'application/json'}, body: JSON.stringify(p6) });
    const data6 = await res6.json();
    if(data6.classification?.isTask === true && data6.task) {
       console.log(`✅ Passed: Declarative test classified successfully. ID: ${data6.task.id}, Task: ${data6.task.task}`);
    } else {
       console.log(`❌ Failed: Declarative structure misunderstood: ${JSON.stringify(data6)}`); allPassed = false;
    }

  } catch(e) {
    console.log(`\n❌ ERROR RUNNING TESTS: ${e.message}`);
    allPassed = false;
  }

  console.log(`\n============================\n${allPassed ? 'ALL TESTS PASSED 🎉' : 'FAILURES DETECTED ⚠️'}`);
}

runTests();
