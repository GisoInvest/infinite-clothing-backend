import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../../drizzle/db";
import { orders } from "../../drizzle/schema";
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from "../email";

/**
 * Simplified order router with minimal fields and no complex JSON handling
 * This bypasses all the issues with statusHistory, cancellationDeadline, etc.
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
        // Insert order with only essential fields
        // Let database handle all defaults
        const [order] = await db.insert(orders).values({
          orderNumber: input.orderNumber,
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          customerPhone: input.customerPhone || '',
          shippingAddress: input.shippingAddress,
          items: input.items,
          subtotal: input.subtotal,
          shipping: input.shipping,
          tax: input.tax,
          total: input.total,
          paymentIntentId: input.paymentIntentId,
          // Let database handle these with defaults:
          // status: 'pending' (default)
          // paymentStatus: 'pending' (default)
          // canBeCancelled: true (default)
          // statusHistory: null (nullable)
          // cancellationDeadline: null (nullable)
          // createdAt: now (default)
          // updatedAt: now (default)
        }).$returningId();

        // Get the created order
        const createdOrder = await db.query.orders.findFirst({
          where: (orders, { eq }) => eq(orders.id, order.id),
        });

        if (!createdOrder) {
          throw new Error('Order created but could not be retrieved');
        }

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

        return createdOrder;
      } catch (error) {
        console.error('Order creation error:', error);
        throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
});
