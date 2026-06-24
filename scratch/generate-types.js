const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if present
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index !== -1) {
      const key = trimmed.substring(0, index).trim();
      let val = trimmed.substring(index + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error('Error: SUPABASE_DB_PASSWORD environment variable not set in .env.local or shell environment.');
  process.exit(1);
}

const client = new Client({
  host: process.env.SUPABASE_DB_HOST || 'db.gwtgsxgylwhklrggchuq.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: password,
  ssl: { rejectUnauthorized: false }
});


const pgToTsType = (pgType, isNullable) => {
  let tsType = 'any';
  if (pgType.includes('int') || pgType.includes('float') || pgType.includes('numeric') || pgType.includes('double') || pgType.includes('real')) {
    tsType = 'number';
  } else if (pgType.includes('char') || pgType.includes('text') || pgType.includes('uuid') || pgType.includes('date') || pgType.includes('time') || pgType.includes('timestamp')) {
    tsType = 'string';
  } else if (pgType.includes('bool')) {
    tsType = 'boolean';
  } else if (pgType.includes('json')) {
    tsType = 'Json';
  } else if (pgType.includes('vector')) {
    tsType = 'number[]';
  } else if (pgType.includes('array')) {
    tsType = 'any[]';
  }
  
  return isNullable ? `${tsType} | null` : tsType;
};

async function run() {
  await client.connect();
  console.log('Connected to database for type generation...');

  try {
    // 1. Fetch tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const tables = tablesRes.rows.map(r => r.table_name);

    let tablesCode = '';

    for (const table of tables) {
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1;
      `, [table]);

      let rowFields = '';
      let insertFields = '';
      let updateFields = '';

      for (const col of colsRes.rows) {
        const isNullable = col.is_nullable === 'YES';
        const hasDefault = col.column_default !== null;
        const tsType = pgToTsType(col.data_type, isNullable);

        rowFields += `          ${col.column_name}: ${tsType}\n`;
        
        // Insert: optional if nullable or has default
        const isInsertOptional = isNullable || hasDefault;
        insertFields += `          ${col.column_name}${isInsertOptional ? '?' : ''}: ${tsType}\n`;
        
        // Update: always optional
        updateFields += `          ${col.column_name}?: ${tsType}\n`;
      }

      tablesCode += `      ${table}: {\n        Row: {\n${rowFields}        }\n        Insert: {\n${insertFields}        }\n        Update: {\n${updateFields}        }\n      }\n`;
    }

    const output = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
${tablesCode}    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_canonical_exercises: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          name: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
`;

    const outDir = path.join(__dirname, '..', 'src', 'types');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'database.types.ts');
    fs.writeFileSync(outFile, output);
    console.log(`Successfully generated TypeScript types at ${outFile}!`);
  } catch (err) {
    console.error('Error generating types:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
