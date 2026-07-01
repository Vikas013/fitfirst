const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'db.gwtgsxgylwhklrggchuq.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Vj@supabase1',
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
