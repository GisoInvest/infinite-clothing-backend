import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { createCryptoPayment, getPaymentStatus, getAvailableCurrencies } from "../nowpayments";
import mysql from "mysql2/promise";
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from "../email";

/**
 * Crypto payment router using NOWPayments
 */
export const cryptoCheckoutRouter = router({
  /**
   * Create a crypto payment
   */
  createPayment: publicProcedure
    .input(z.object({
      orderNumber: z.string(),
      customerEmail: z.string().email(),
      customerName: z.string(),
      customerPhone: z.string().optional(),
      shippingAddress: z.object({
        line1: z.string(),
        line2: z.string().optional(),
        city: z.string(),
        state: z.string(),
        postalCode: z.string(),
        country: z.string(),
      }),
      items: z.array(z.object({
        productId: z.number(),
        productName: z.string(),
        quantity: z.number(),
        price: z.number(),
      })),
      subtotal: z.number().int(),
      shipping: z.number().int(),
      tax: z.number().int(),
      total: z.number().int(),
      payCurrency: z.string().optional(), // Optional: specific crypto (BTC, ETH, etc.)
    }))
    .mutation(async ({ input }) => {
      try {
        // Convert total from cents to GBP
        const totalInGBP = input.total / 100;

        // Create payment with NOWPayments
        const payment = await createCryptoPayment({
          priceAmount: totalInGBP,
          priceCurrency: "GBP",
          payCurrency: input.payCurrency,
          orderNumber: input.orderNumber,
          orderDescription: `Order #${input.orderNumber} - ${input.items.length} items`,
          ipnCallbackUrl: `${process.env.BACKEND_URL}/api/webhooks/nowpayments`,
        });

        // Create order in database with pending status
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL not configured');
        }

        const connection = await mysql.createConnection(process.env.DATABASE_URL);

        try {
          const statusHistory = JSON.stringify([{
            status: 'pending',
            timestamp: new Date().toISOString(),
            notes: 'Crypto payment initiated'
          }]);

          await connection.execute(
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
              status,
              paymentStatus,
              paymentMethod,
              cryptoPaymentId,
              cryptoCurrency,
              cryptoAmount,
              statusHistory,
              canBeCancelled
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              input.orderNumber,
              input.customerEmail,
              input.customerName,
              input.customerPhone || '',
              JSON.stringify(input.shippingAddress),
              JSON.stringify(input.items),
              input.subtotal,
              input.shipping,
              input.tax,
              input.total,
              'pending',
              'pending',
              'crypto',
              payment.payment_id,
              payment.pay_currency,
              payment.pay_amount.toString(),
              statusHistory,
              true
            ]
          );

          console.log('Crypto order created:', input.orderNumber);

          return {
            success: true,
            paymentId: payment.payment_id,
            paymentUrl: payment.payment_url,
            payAddress: payment.pay_address,
            payAmount: payment.pay_amount,
            payCurrency: payment.pay_currency,
          };
        } finally {
          await connection.end();
        }
      } catch (error) {
        console.error("Create crypto payment error:", error);
        throw new Error("Failed to create crypto payment");
      }
    }),

  /**
   * Check payment status
   */
  checkPaymentStatus: publicProcedure
    .input(z.object({
      paymentId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const status = await getPaymentStatus(input.paymentId);
        return status;
      } catch (error) {
        console.error("Check payment status error:", error);
        throw new Error("Failed to check payment status");
      }
    }),

  /**
   * Get available cryptocurrencies
   */
  getAvailableCurrencies: publicProcedure
    .query(async () => {
      try {
        const currencies = await getAvailableCurrencies();
        return currencies;
      } catch (error) {
        console.error("Get currencies error:", error);
        throw new Error("Failed to get available currencies");
      }
    }),

  /**
   * Handle NOWPayments IPN (Instant Payment Notification) webhook
   */
  handleWebhook: publicProcedure
    .input(z.object({
      payment_id: z.string(),
      payment_status: z.string(),
      pay_address: z.string(),
      price_amount: z.number(),
      price_currency: z.string(),
      pay_amount: z.number(),
      pay_currency: z.string(),
      order_id: z.string(),
      order_description: z.string(),
      actually_paid: z.number().optional(),
      outcome_amount: z.number().optional(),
      outcome_currency: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log("NOWPayments webhook received:", input);

        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL not configured');
        }

        const connection = await mysql.createConnection(process.env.DATABASE_URL);

        try {
          // Update order payment status based on webhook
          let paymentStatus = 'pending';
          let orderStatus = 'pending';

          if (input.payment_status === 'finished' || input.payment_status === 'confirmed') {
            paymentStatus = 'succeeded';
            orderStatus = 'processing';

            // Send confirmation emails
            const [rows] = await connection.execute(
              'SELECT * FROM orders WHERE orderNumber = ?',
              [input.order_id]
            );

            if (Array.isArray(rows) && rows.length > 0) {
              const order = rows[0] as any;
              
              try {
                await sendOrderConfirmationEmail({
                  orderNumber: order.orderNumber,
                  customerName: order.customerName,
                  customerEmail: order.customerEmail,
                  items: JSON.parse(order.items),
                  subtotal: order.subtotal,
                  shipping: order.shipping,
                  tax: order.tax,
                  total: order.total,
                  shippingAddress: JSON.parse(order.shippingAddress),
                });

                await sendAdminOrderNotification({
                  orderNumber: order.orderNumber,
                  customerName: order.customerName,
                  customerEmail: order.customerEmail,
                  items: JSON.parse(order.items),
                  total: order.total,
                  shippingAddress: JSON.parse(order.shippingAddress),
                });
              } catch (emailError) {
                console.error("Failed to send confirmation emails:", emailError);
              }
            }
          } else if (input.payment_status === 'failed' || input.payment_status === 'expired') {
            paymentStatus = 'failed';
            orderStatus = 'cancelled';
          }

          // Update order status
          await connection.execute(
            `UPDATE orders 
             SET paymentStatus = ?, 
                 status = ?,
                 cryptoAmount = ?,
                 updatedAt = NOW()
             WHERE orderNumber = ?`,
            [paymentStatus, orderStatus, input.actually_paid?.toString() || input.pay_amount.toString(), input.order_id]
          );

          console.log(`Order ${input.order_id} updated: payment=${paymentStatus}, order=${orderStatus}`);

          return { success: true };
        } finally {
          await connection.end();
        }
      } catch (error) {
        console.error("Webhook handling error:", error);
        throw new Error("Failed to handle webhook");
      }
    }),
});
