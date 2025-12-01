import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from "../email";
import mysql from "mysql2/promise";

/**
 * Simplified order router using direct MySQL connection
 */
export const simpleOrdersRouter = router({
  create: publicProcedure
    .input(z.object({
      orderNumber: z.string(),
      customerEmail: z.string().email(),
      customerName: z.string(),
      customerPhone: z.string().optional(),
      shippingAddress: z.string(), // Store as simple JSON string
      items: z.string(), // Store as simple JSON string
      subtotal: z.number().int(),
      shipping: z.number().int(),
      tax: z.number().int(),
      total: z.number().int(),
      paymentIntentId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL not configured');
        }

        // Create direct MySQL connection
        const connection = await mysql.createConnection(process.env.DATABASE_URL);

        try {
          // Create initial status history
          const statusHistory = JSON.stringify([{
            status: 'pending',
            timestamp: new Date().toISOString(),
            notes: 'Order created'
          }]);

          // Insert order using direct MySQL query with proper parameter binding
          const [result] = await connection.execute(
            `INSERT INTO orders (
              orderNumber,
              customerEmail,
              customerName,
              customerPhone,
              shippingAddress,
              items,
              subtotal,
              shipping,
              tax,
              total,
              paymentIntentId,
              status,
              paymentStatus,
              statusHistory,
              canBeCancelled
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              input.orderNumber,
              input.customerEmail,
              input.customerName,
              input.customerPhone || '',
              input.shippingAddress,
              input.items,
              input.subtotal,
              input.shipping,
              input.tax,
              input.total,
              input.paymentIntentId || '',
              'pending',
              'succeeded',
              statusHistory,
              true
            ]
          );

          console.log('Order inserted successfully:', result);

          // Parse items for email
          const parsedItems = JSON.parse(input.items);
          const parsedAddress = JSON.parse(input.shippingAddress);

          // Send confirmation emails (don't fail order if emails fail)
          try {
            await sendOrderConfirmationEmail({
              orderNumber: input.orderNumber,
              customerName: input.customerName,
              customerEmail: input.customerEmail,
              items: parsedItems,
              subtotal: input.subtotal,
              shipping: input.shipping,
              tax: input.tax,
              total: input.total,
              shippingAddress: parsedAddress,
            });

            await sendAdminOrderNotification({
              orderNumber: input.orderNumber,
              customerName: input.customerName,
              customerEmail: input.customerEmail,
              items: parsedItems,
              subtotal: input.subtotal,
              shipping: input.shipping,
              tax: input.tax,
              total: input.total,
              shippingAddress: parsedAddress,
            });
          } catch (emailError) {
            console.error('Failed to send order emails:', emailError);
            // Don't fail the order creation if emails fail
          }

          return {
            success: true,
            orderNumber: input.orderNumber,
            message: 'Order created successfully'
          };
        } finally {
          // Always close the connection
          await connection.end();
        }
      } catch (error) {
        console.error('Order creation error:', error);
        throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
});
