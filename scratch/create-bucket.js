const { Client } = require('pg');

const client = new Client({
  host: 'db.gwtgsxgylwhklrggchuq.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Vj@supabase1',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to database!');

  try {
    // 1. Insert bucket if not exists
    console.log('Inserting bucket "fitness-ingestion-staging"...');
    await client.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('fitness-ingestion-staging', 'fitness-ingestion-staging', false, 524288000, ARRAY['video/mp4', 'video/quicktime'])
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('Bucket check completed.');

    // 2. Enable RLS is already active by default in Supabase storage schema.

    // 3. Drop existing policies to prevent conflicts
    console.log('Dropping old storage policies if any...');
    await client.query(`DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;`);
    await client.query(`DROP POLICY IF EXISTS "Allow authenticated select" ON storage.objects;`);
    await client.query(`DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;`);

    // 4. Create upload, select, and delete policies
    console.log('Creating new storage RLS policies...');
    await client.query(`
      CREATE POLICY "Allow authenticated uploads" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'fitness-ingestion-staging');
    `);

    await client.query(`
      CREATE POLICY "Allow authenticated select" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'fitness-ingestion-staging');
    `);

    await client.query(`
      CREATE POLICY "Allow authenticated delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'fitness-ingestion-staging');
    `);

    console.log('Storage bucket and policies configured successfully!');
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await client.end();
  }
}

run();
