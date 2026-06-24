const { Client } = require('pg');

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("SUPABASE_DB_PASSWORD environment variable not set.");
  process.exit(1);
}

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
    
    console.log("Checking user 'jv@gmail.com' in database...");
    const res = await client.query(
      "SELECT id, email, email_confirmed_at, confirmed_at FROM auth.users WHERE email = $1",
      ['jv@gmail.com']
    );

    if (res.rows.length === 0) {
      console.log("User 'jv@gmail.com' does NOT exist in the auth.users database.");
      return;
    }

    const userId = res.rows[0].id;
    console.log(`User Found. ID: ${userId}`);

    console.log("\nChecking profiles table for user ID...");
    const profileRes = await client.query(
      "SELECT * FROM public.profiles WHERE id = $1",
      [userId]
    );

    if (profileRes.rows.length === 0) {
      console.log("WARNING: No row exists in public.profiles for this user!");
    } else {
      const p = profileRes.rows[0];
      console.log("Profile Found Details:");
      console.log("-----------------------------------------");
      console.log("Onboarded Status:", p.onboarded);
      console.log("Goal:", p.primary_goal);
      console.log("Height:", p.height);
      console.log("Weight:", p.weight);
      console.log("Default Steps Goal:", p.default_steps_goal);
      console.log("-----------------------------------------");
    }

  } catch (err) {
    console.error("Database query failed:", err.message);
  } finally {
    await client.end();
  }
}

main();
