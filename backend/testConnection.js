require('dotenv').config();
const { Client } = require('pg');

async function test() {
    console.log("Connecting to", process.env.DATABASE_URL);
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        const res = await client.query('SELECT NOW()');
        console.log("Success! Server time:", res.rows[0]);
    } catch(err) {
        console.error("Connection failed:", err.message);
    } finally {
        await client.end();
    }
}
test();
