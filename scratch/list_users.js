const { Client } = require('pg');

const password = process.env.SUPABASE_DB_PASSWORD || 'Vj@supabase1';
const encodedPassword = encodeURIComponent(password);
const connectionString = `postgresql://postgres:${encodedPassword}@db.gwtgsxgylwhklrggchuq.supabase.co:5432/postgres`;

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    await client.connect();
    const res = await client.query("SELECT id, email, email_confirmed_at, last_sign_in_at FROM auth.users");
    console.log("Users in Database:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Failed:", err.message);
  } finally {
    await client.end();
  }
}

main();
