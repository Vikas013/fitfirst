const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("SUPABASE_DB_PASSWORD environment variable not set.");
  process.exit(1);
}

// Percent-encode special characters in password for the connection URI
const encodedPassword = encodeURIComponent(password);
const connectionString = `postgresql://postgres:${encodedPassword}@db.gwtgsxgylwhklrggchuq.supabase.co:5432/postgres`;

console.log("Connecting to Supabase Database...");

const sqlPath = path.join(__dirname, 'setup.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Supabase SSL connections
  }
});

async function main() {
  try {
    await client.connect();
    console.log("Connected successfully. Running SQL setup script...");
    await client.query(sql);
    console.log("SQL script executed successfully! Tables and policies are created.");
  } catch (err) {
    console.error("Failed to execute SQL script:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
