import { promises as fs } from 'fs';
import path from 'path';
import { getDb } from './db';

/**
 * Runs all pending migrations from the drizzle directory
 * Migrations are SQL files named with a numeric prefix (e.g., 0013_add_pageviews_table.sql)
 */
export async function runMigrations() {
  const db = await getDb();
  if (!db) {
    console.warn('[Migrations] Database not available, skipping migrations');
    return;
  }

  try {
    // Get the drizzle directory path
    const migrationsDir = path.join(process.cwd(), 'drizzle');
    
    // Read all SQL files from the drizzle directory
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files
      .filter(file => file.endsWith('.sql') && /^\d+_/.test(file))
      .sort(); // Sort numerically by filename

    if (sqlFiles.length === 0) {
      console.log('[Migrations] No migration files found');
      return;
    }

    console.log(`[Migrations] Found ${sqlFiles.length} migration files`);

    // Execute each migration file
    for (const file of sqlFiles) {
      try {
        const filePath = path.join(migrationsDir, file);
        const sql = await fs.readFile(filePath, 'utf-8');
        
        // Split by semicolon to handle multiple statements
        const statements = sql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
          await db.execute(statement as any);
        }

        console.log(`[Migrations] ✓ Applied: ${file}`);
      } catch (error: any) {
        // If the error is about tables already existing, that's okay
        if (error.message?.includes('already exists') || error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`[Migrations] ℹ Skipped (already exists): ${file}`);
        } else {
          console.error(`[Migrations] ✗ Failed to apply ${file}:`, error.message);
          throw error;
        }
      }
    }

    console.log('[Migrations] All migrations completed successfully');
  } catch (error) {
    console.error('[Migrations] Migration runner failed:', error);
    throw error;
  }
}
