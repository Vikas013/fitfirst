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
    
    // 1. Find the user ID
    console.log("Finding user by email...");
    const userRes = await client.query(
      "SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = $1", 
      ['jainvikas013@gmail.com']
    );

    if (userRes.rows.length === 0) {
      console.log("User 'jainvikas013@gmail.com' not found in auth.users.");
      return;
    }

    const user = userRes.rows[0];
    const userId = user.id;
    console.log(`Found User: ${user.email} (ID: ${userId})`);
    console.log(`Metadata:`, JSON.stringify(user.raw_user_meta_data));
    console.log("--------------------------------------------------");

    // 2. Query workouts
    console.log("Fetching workouts...");
    const workoutsRes = await client.query(
      "SELECT * FROM public.workouts WHERE user_id = $1 ORDER BY logged_at DESC",
      [userId]
    );
    console.log(`Workouts found: ${workoutsRes.rows.length}`);
    workoutsRes.rows.forEach((w, idx) => {
      console.log(`  ${idx+1}. Activity: ${w.activity_type}, Duration: ${w.duration} mins, Calories: ${w.calories_burned} kcal, Logged At: ${w.logged_at}`);
      if (w.notes) console.log(`     Notes: "${w.notes}"`);
    });
    console.log("--------------------------------------------------");

    // 3. Query daily metrics
    console.log("Fetching daily metrics...");
    const metricsRes = await client.query(
      "SELECT * FROM public.daily_metrics WHERE user_id = $1 ORDER BY date DESC",
      [userId]
    );
    console.log(`Daily metrics rows found: ${metricsRes.rows.length}`);
    metricsRes.rows.forEach((m, idx) => {
      console.log(`  ${idx+1}. Date: ${m.date}`);
      console.log(`     Steps: ${m.steps} / ${m.steps_goal}`);
      console.log(`     Active Minutes: ${m.active_minutes} / ${m.active_minutes_goal}`);
      console.log(`     Water Intake: ${m.water_intake} / ${m.water_goal} cups`);
      console.log(`     Calories Goal: ${m.calories_goal} kcal`);
    });

  } catch (err) {
    console.error("Database query failed:", err.message);
  } finally {
    await client.end();
  }
}

main();
