const { spawn } = require('child_process');

const server = spawn('node', ['src/server.js']);

server.stdout.on('data', d => process.stdout.write('OUT: ' + d.toString()));
server.stderr.on('data', d => process.stderr.write('ERR: ' + d.toString()));

async function run() {
    await new Promise(r => setTimeout(r, 4000));
    
    const payload = {
        source: 'whatsapp',
        sender: 'Friend',
        message: 'Flight exam @10 tomorrow in ALHC 304',
        receivedAt: '2026-08-29T17:15:00.000Z'
    };
    
    console.log("SENDING REQUEST:");
    try {
        const res = await fetch('http://localhost:5000/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log("API RESPONSE:", await res.text());
    } catch(err) {
        console.error("API FAILED:", err);
    }
    
    await new Promise(r => setTimeout(r, 2000));
    console.log("Exiting cleanly to flush streams...");
    server.kill('SIGINT');
    setTimeout(() => process.exit(0), 1000);
}
run();
