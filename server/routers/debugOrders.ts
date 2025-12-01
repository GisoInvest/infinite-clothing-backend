import { publicProcedure, router } from "../_core/trpc";
import mysql from "mysql2/promise";

/**
 * Debug router to check orders in database
 */
export const debugOrdersRouter = router({
  checkOrders: publicProcedure.query(async () => {
    try {
      if (!process.env.DATABASE_URL) {
        return { error: 'DATABASE_URL not configured' };
      }

      const connection = await mysql.createConnection(process.env.DATABASE_URL);

      try {
        // Get all orders using raw SQL
        const [rows] = await connection.execute('SELECT * FROM orders ORDER BY createdAt DESC LIMIT 10');
        
        return {
          success: true,
          count: Array.isArray(rows) ? rows.length : 0,
          orders: rows
        };
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Debug orders error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }),
});
