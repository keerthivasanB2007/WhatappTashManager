const fs = require('fs');
const { spawn } = require('child_process');

// Append directly so no buffering issues
const log = str => { fs.appendFileSync('test_run.log', str + '\n'); };
fs.writeFileSync('test_run.log', 'Starting final tests...\n');

const server = spawn('node', ['src/server.js']);
server.stdout.on('data', d => { let s = d.toString().trim(); if (s.includes('Groq AI') || s.includes('Message received') || s.includes('Task created')) fs.appendFileSync('test_run.log', s + '\n'); });
server.stderr.on('data', d => fs.appendFileSync('test_run.log', 'ERR: ' + d.toString() + '\n'));

(async () => {
    await new Promise(r => setTimeout(r, 6000));
    try {
        const tests = [
            { source: 'whatsapp', sender: 'Boss', message: 'Submit the NDC assignment before 10th September', receivedAt: '2026-08-29T10:00:00.000Z' },
            { source: 'whatsapp', sender: 'Friend', message: 'Flight exam @10 tomorrow in ALHC 304', receivedAt: '2026-08-29T10:00:00.000Z' },
            { source: 'whatsapp', sender: 'Team', message: 'Team meeting tomorrow at 3 PM', receivedAt: '2026-08-29T10:00:00.000Z' },
            { source: 'whatsapp', sender: 'Friend', message: 'Hey bro, what are you doing?', receivedAt: '2026-08-29T10:00:00.000Z' },
            { source: 'whatsapp', sender: 'System', message: '4 new messages', receivedAt: '2026-08-29T10:00:00.000Z' }
        ];

        for (let i = 0; i < tests.length; i++) {
            log('\n--- Test ' + (i+1) + ': ' + tests[i].message + ' ---');
            const res = await fetch('http://localhost:5000/api/messages', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tests[i])
            });
            log(await res.text());
        }

        log('\n--- Test Dup: Flight exam ---');
        const dupRes = await fetch('http://localhost:5000/api/messages', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tests[1])
        });
        log(await dupRes.text());

        log('\n--- Final DB State ---');
        const { PrismaClient } = require('@prisma/client');
        const p = new PrismaClient();
        const records = await p.task.findMany({ select: { originalMessage: true, task: true }, take: 10, orderBy: {createdAt:'desc'} });
        log(JSON.stringify(records, null, 2));
        await p.$disconnect();
    } catch(e) { log('Error: ' + String(e)); }
    server.kill();
    process.exit();
})();
