import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from "../email";
import { sql } from "drizzle-orm";

/**
 * Simplified order router using raw SQL for guaranteed insertion
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
        const db = await getDb();
        if (!db) {
          throw new Error('Database not available');
        }

        // Use raw SQL to insert order - this guarantees it works
        const result = await db.execute(sql`
          INSERT INTO orders (
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
            paymentStatus
          ) VALUES (
            ${input.orderNumber},
            ${input.customerEmail},
            ${input.customerName},
            ${input.customerPhone || ''},
            ${input.shippingAddress},
            ${input.items},
            ${input.subtotal},
            ${input.shipping},
            ${input.tax},
            ${input.total},
            ${input.paymentIntentId || ''},
            'pending',
            'paid'
          )
        `);

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
      } catch (error) {
        console.error('Order creation error:', error);
        throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
});
