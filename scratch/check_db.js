const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing environment variables!");
  process.exit(1);
}

console.log("Checking Supabase connection to:", url);

async function checkTable(tableName) {
  try {
    const res = await fetch(`${url}/rest/v1/${tableName}?select=*`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    console.log(`Table '${tableName}' HTTP status:`, res.status);
    const text = await res.text();
    console.log(`Response summary:`, text.substring(0, 300));
  } catch (err) {
    console.error(`Error checking ${tableName}:`, err.message);
  }
}

async function main() {
  await checkTable('workouts');
  await checkTable('daily_metrics');
}

main();
