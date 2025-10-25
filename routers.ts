import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { createPaymentIntent, confirmPaymentIntent } from "./payment";
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from "./email";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  products: router({
    // Public endpoints
    getAll: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        subcategory: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getAllProducts({
          ...input,
          active: true,
        });
      }),

    getFeatured: publicProcedure.query(async () => {
      return await db.getFeaturedProducts();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const product = await db.getProduct(input.id);
        if (!product || !product.active) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
        }
        return product;
      }),

    // Admin endpoints
    getAllAdmin: adminProcedure
      .input(z.object({
        category: z.string().optional(),
        subcategory: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getAllProducts(input);
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        price: z.number().int().positive(),
        category: z.enum(["men", "women", "unisex", "kids-baby"]),
        subcategory: z.string(),
        stock: z.number().int().default(0),
        images: z.array(z.string()).default([]),
        videos: z.array(z.string()).default([]),
        featured: z.boolean().default(false),
        active: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        return await db.createProduct(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.number().int().positive().optional(),
        category: z.enum(["men", "women", "unisex", "kids-baby"]).optional(),
        subcategory: z.string().optional(),
        stock: z.number().int().optional(),
        images: z.array(z.string()).optional(),
        videos: z.array(z.string()).optional(),
        featured: z.boolean().optional(),
        active: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const product = await db.updateProduct(id, updates);
        if (!product) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
        }
        return product;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteProduct(input.id);
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
        }
        return { success };
      }),

    uploadImage: adminProcedure
      .input(z.object({
        fileName: z.string(),
        fileData: z.string(), // base64 data URL
        contentType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        
        // Extract base64 data from data URL
        const base64Data = input.fileData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique filename
        const timestamp = Date.now();
        const ext = input.fileName.split('.').pop();
        const key = `products/${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
        
        // Upload to S3
        const result = await storagePut(key, buffer, input.contentType);
        return result;
      }),
  }),

  payment: router({
    createIntent: publicProcedure
      .input(z.object({
        amount: z.number().int().positive(),
        orderNumber: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { clientSecret, paymentIntentId } = await createPaymentIntent({
          amount: input.amount,
          currency: 'gbp',
          metadata: {
            orderNumber: input.orderNumber,
          },
        });
        return { clientSecret, paymentIntentId };
      }),

    confirmIntent: publicProcedure
      .input(z.object({ paymentIntentId: z.string() }))
      .query(async ({ input }) => {
        return await confirmPaymentIntent(input.paymentIntentId);
      }),
  }),

  orders: router({
    // Public endpoints
    create: publicProcedure
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
          quantity: z.number().int().positive(),
          price: z.number().int().positive(),
        })),
        subtotal: z.number().int(),
        shipping: z.number().int(),
        tax: z.number().int(),
        total: z.number().int(),
        paymentIntentId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const order = await db.createOrder(input);
        
        // Send confirmation emails
        try {
          await sendOrderConfirmationEmail({
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            items: order.items as any,
            subtotal: order.subtotal,
            shipping: order.shipping,
            tax: order.tax,
            total: order.total,
            shippingAddress: order.shippingAddress as any,
          });
          
          await sendAdminOrderNotification({
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            items: order.items as any,
            subtotal: order.subtotal,
            shipping: order.shipping,
            tax: order.tax,
            total: order.total,
            shippingAddress: order.shippingAddress as any,
          });
        } catch (emailError) {
          console.error('Failed to send order emails:', emailError);
          // Don't fail the order creation if emails fail
        }
        
        return order;
      }),

    getByNumber: publicProcedure
      .input(z.object({ orderNumber: z.string() }))
      .query(async ({ input }) => {
        const order = await db.getOrderByNumber(input.orderNumber);
        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        }
        return order;
      }),

    // Admin endpoints
    getAll: adminProcedure.query(async () => {
      return await db.getAllOrders();
    }),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const order = await db.getOrder(input.id);
        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        }
        return order;
      }),

    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]),
        trackingNumber: z.string().optional(),
        shippingLabelUrl: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const order = await db.updateOrder(id, updates);
        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        }
        return order;
      }),

    updatePaymentStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        paymentStatus: z.enum(["pending", "succeeded", "failed"]),
        paymentIntentId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const order = await db.updateOrder(id, updates);
        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        }
        return order;
      }),
  }),

  audio: router({
    // Public endpoints
    getActive: publicProcedure.query(async () => {
      return await db.getActiveAudioTracks();
    }),

    // Admin endpoints
    getAll: adminProcedure.query(async () => {
      return await db.getAllAudioTracks();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string(),
        url: z.string(),
        active: z.boolean().default(true),
        order: z.number().int().default(0),
      }))
      .mutation(async ({ input }) => {
        return await db.createAudioTrack(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        url: z.string().optional(),
        active: z.boolean().optional(),
        order: z.number().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const track = await db.updateAudioTrack(id, updates);
        if (!track) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Audio track not found' });
        }
        return track;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteAudioTrack(input.id);
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Audio track not found' });
        }
        return { success };
      }),

    uploadFile: adminProcedure
      .input(z.object({
        fileName: z.string(),
        fileData: z.string(), // base64 data URL
        contentType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        
        // Extract base64 data from data URL
        const base64Data = input.fileData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique filename
        const timestamp = Date.now();
        const ext = input.fileName.split('.').pop();
        const key = `audio/${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
        
        // Upload to S3
        const result = await storagePut(key, buffer, input.contentType);
        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;

