import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { createPaymentIntent, confirmPaymentIntent } from "./payment";
import { createCheckoutSession } from "./checkout";
import { sendOrderConfirmationEmail, sendAdminOrderNotification, sendOrderStatusEmail, sendOrderCancellationEmail } from "./email";
import { assistantRouter } from "./routers/assistant";
import { simpleOrdersRouter } from "./routers/simpleOrders";

// Admin-only procedure (simple cookie-based auth)
const adminProcedure = publicProcedure.use(({ ctx, next }) => {
  const adminSession = ctx.req.cookies?.['admin_session'];
  if (!adminSession || adminSession !== 'admin_session_active') {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin login required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  assistant: assistantRouter,
  simpleOrders: simpleOrdersRouter,

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
      const products = await db.getFeaturedProducts();
      return products;
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const product = await db.getProductById(input.id);
        if (!product) {
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
        stock: z.number().default(0),
        images: z.array(z.string()).default([]),
        videos: z.array(z.string()).default([]),
        colors: z.array(z.string()).default([]),
        sizes: z.array(z.string()).default([]),
        discount: z.number().int().min(0).max(100).default(0),
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
        stock: z.number().optional(),
        images: z.array(z.string()).optional(),
        videos: z.array(z.string()).optional(),
        colors: z.array(z.string()).optional(),
        sizes: z.array(z.string()).optional(),
        discount: z.number().int().min(0).max(100).optional(),
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

    createCheckoutSession: publicProcedure
      .input(z.object({
        orderNumber: z.string(),
        customerEmail: z.string().email(),
        customerName: z.string(),
        customerPhone: z.string().optional(),
        shippingAddress: z.string(),
        items: z.string(),
        subtotal: z.number().int(),
        shipping: z.number().int(),
        tax: z.number().int(),
        total: z.number().int(),
      }))
      .mutation(async ({ input }) => {
        const parsedItems = JSON.parse(input.items);
        
        const { sessionId, url } = await createCheckoutSession({
          orderNumber: input.orderNumber,
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          items: parsedItems,
          total: input.total,
          metadata: {
            orderNumber: input.orderNumber,
            customerEmail: input.customerEmail,
            customerName: input.customerName,
            customerPhone: input.customerPhone || '',
            shippingAddress: input.shippingAddress,
            items: input.items,
            subtotal: input.subtotal.toString(),
            shipping: input.shipping.toString(),
            tax: input.tax.toString(),
            total: input.total.toString(),
          },
        });
        
        return { sessionId, url };
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
        // Set cancellationDeadline to far future date when cancellation is disabled
        const farFutureDate = new Date();
        farFutureDate.setFullYear(farFutureDate.getFullYear() + 100);
        const cancellationDeadlineStr = farFutureDate.toISOString().slice(0, 19).replace('T', ' ');

        const order = await db.createOrder({
          ...input,
          canBeCancelled: false, // Set to false to disable cancellation feature for now
          cancellationDeadline: cancellationDeadlineStr, // Far future date to satisfy database
          statusHistory: [{
            status: 'pending',
            timestamp: new Date().toISOString(),
            notes: 'Order created',
          }],
        });
        
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
        status: z.enum(["pending", "processing", "in_production", "shipped", "delivered", "cancelled", "refunded"]),
        trackingNumber: z.string().optional(),
        shippingCarrier: z.string().optional(),
        estimatedDelivery: z.string().optional(), // ISO date string
        tapstitchOrderId: z.string().optional(),
        internalNotes: z.string().optional(),
        shippingLabelUrl: z.string().optional(),
        notes: z.string().optional(),
        sendEmail: z.boolean().default(false), // Whether to send status update email
      }))
      .mutation(async ({ input }) => {
        const { id, sendEmail, ...updates } = input;
        
        // Get current order to track status history
        const currentOrder = await db.getOrder(id);
        if (!currentOrder) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        }
        
        // Build status history entry
        const statusHistory = currentOrder.statusHistory as any[] || [];
        if (updates.status && updates.status !== currentOrder.status) {
          statusHistory.push({
            status: updates.status,
            timestamp: new Date().toISOString(),
            updatedBy: 'admin',
            notes: updates.internalNotes || updates.notes,
          });
        }
        
        // Update order with status history
        const order = await db.updateOrder(id, {
          ...updates,
          statusHistory,
        });
        
        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        }
        
        // Send email notification if requested
        if (sendEmail && updates.status) {
          try {
            await sendOrderStatusEmail({
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              customerEmail: order.customerEmail,
              status: updates.status,
              trackingNumber: updates.trackingNumber || order.trackingNumber,
              shippingCarrier: updates.shippingCarrier || order.shippingCarrier,
              estimatedDelivery: updates.estimatedDelivery,
            });
          } catch (emailError) {
            console.error('Failed to send status update email:', emailError);
            // Don't fail the update if email fails
          }
        }
        
        return order;
      }),

    cancelOrder: publicProcedure
      .input(z.object({
        orderNumber: z.string(),
        customerEmail: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        // Get order by number
        const order = await db.getOrderByNumber(input.orderNumber);
        if (!order) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        }
        
        // Verify email matches
        if (order.customerEmail !== input.customerEmail) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email does not match order' });
        }
        
        // Check if order can be cancelled
        if (!order.canBeCancelled) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Order cancellation window has expired (24 hours)' });
        }
        
        // Check if cancellation deadline has passed
        if (order.cancellationDeadline && new Date() > new Date(order.cancellationDeadline)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Order cancellation window has expired' });
        }
        
        // Check if order is already cancelled or shipped
        if (['cancelled', 'shipped', 'delivered'].includes(order.status)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Cannot cancel order with status: ${order.status}` });
        }
        
        // Update order status to cancelled
        const statusHistory = order.statusHistory as any[] || [];
        statusHistory.push({
          status: 'cancelled',
          timestamp: new Date().toISOString(),
          updatedBy: 'customer',
          notes: 'Cancelled by customer',
        });
        
        const updatedOrder = await db.updateOrder(order.id, {
          status: 'cancelled',
          canBeCancelled: false,
          statusHistory,
        });
        
        // Send cancellation confirmation email
        try {
          await sendOrderCancellationEmail({
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            total: order.total,
          });
        } catch (emailError) {
          console.error('Failed to send cancellation email:', emailError);
        }
        
        return updatedOrder;
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

    getMusicEnabled: publicProcedure.query(async () => {
      return await db.getBackgroundMusicEnabled();
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

    setMusicEnabled: adminProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.setBackgroundMusicEnabled(input.enabled);
        return { success: true, enabled: input.enabled };
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

  blog: router({ 
    // Public endpoints
    getAll: publicProcedure.query(async () => {
      return await db.getPublishedBlogPosts();
    }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const post = await db.getBlogPostBySlug(input.slug);
        if (!post || post.status !== 'published') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Blog post not found' });
        }
        // Increment view count
        await db.incrementBlogPostViews(post.id);
        return post;
      }),

    getByCategory: publicProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => {
        return await db.getBlogPostsByCategory(input.category);
      }),

    // Admin endpoints
    getAllAdmin: adminProcedure.query(async () => {
      return await db.getAllBlogPosts();
    }),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const post = await db.getBlogPost(input.id);
        if (!post) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Blog post not found' });
        }
        return post;
      }),

    create: adminProcedure
      .input(z.object({
        title: z.string(),
        slug: z.string(),
        excerpt: z.string().optional(),
        content: z.string(),
        coverImage: z.string().optional(),
        images: z.array(z.string()).default([]),
        category: z.string().optional(),
        tags: z.array(z.string()).default([]),
        authorId: z.number(),
        authorName: z.string(),
        status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
        publishedAt: z.date().optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        metaKeywords: z.string().optional(),
        facebookPost: z.string().optional(),
        instagramPost: z.string().optional(),
        tiktokPost: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createBlogPost(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        slug: z.string().optional(),
        excerpt: z.string().optional(),
        content: z.string().optional(),
        coverImage: z.string().optional(),
        images: z.array(z.string()).optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        status: z.enum(['draft', 'published', 'scheduled']).optional(),
        publishedAt: z.date().optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        metaKeywords: z.string().optional(),
        facebookPost: z.string().optional(),
        instagramPost: z.string().optional(),
        tiktokPost: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const post = await db.updateBlogPost(id, updates);
        if (!post) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Blog post not found' });
        }
        return post;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteBlogPost(input.id);
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Blog post not found' });
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
        const key = `blog/${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
        
        // Upload to S3
        const result = await storagePut(key, buffer, input.contentType);
        return result;
      }),
  }),

  // Product reviews
  reviews: router({
    // Public endpoints
    getByProduct: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductReviews(input.productId);
      }),

    getAverageRating: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductAverageRating(input.productId);
      }),

    create: publicProcedure
      .input(z.object({
        productId: z.number(),
        rating: z.number().min(1).max(5),
        title: z.string().optional(),
        comment: z.string(),
        userName: z.string(),
        userEmail: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const review = await db.createProductReview({
          ...input,
          userId: undefined,
          verifiedPurchase: false,
          status: 'approved',
        });
        return review;
      }),

    markHelpful: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.incrementReviewHelpful(input.id);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // TODO: Add check to ensure user can only delete their own reviews
        const success = await db.deleteProductReview(input.id);
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Review not found' });
        }
        return { success };
      }),
  }),

  // Newsletter subscription
  newsletter: router({
    subscribe: publicProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check if already subscribed
        const existing = await db.getNewsletterSubscriberByEmail(input.email);
        if (existing) {
          if (existing.status === 'active') {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Email already subscribed' });
          }
          if (existing.status === 'unsubscribed') {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Email previously unsubscribed. Please contact support.' });
          }
        }

        // Generate confirmation token
        const confirmationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        
        const subscriber = await db.createNewsletterSubscriber({
          email: input.email,
          name: input.name,
          confirmationToken,
          status: 'active', // For now, skip email confirmation
          confirmedAt: new Date(),
        });

        // Generate unique 10% discount code for new subscriber
        const discountCode = await db.generateUniqueDiscountCode('WELCOME');
        await db.createDiscountCode({
          code: discountCode,
          discountType: 'percentage',
          discountValue: '10',
          minPurchaseAmount: '0',
          maxUses: 1,
          subscriberEmail: input.email,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          isActive: true,
        });

        // Send welcome email with discount code
        const { sendWelcomeEmail } = await import('./sendgrid');
        const emailSent = await sendWelcomeEmail(input.email, input.name, discountCode);
        
        if (!emailSent) {
          console.error('[Newsletter] Failed to send welcome email to:', input.email);
          // Still return success since subscription was created
          return { success: true, message: 'Successfully subscribed! Your discount code is: ' + discountCode, discountCode };
        }
        
        return { success: true, message: 'Successfully subscribed! Check your email for your discount code.', discountCode };
      }),

    unsubscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const success = await db.unsubscribeNewsletter(input.email);
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Email not found' });
        }
        return { success: true, message: 'Successfully unsubscribed' };
      }),

    confirm: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const success = await db.confirmNewsletterSubscription(input.token);
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid confirmation token' });
        }
        return { success: true, message: 'Email confirmed!' };
      }),
  }),

  // Email campaigns (admin only)
  emailCampaigns: router({
    getAll: adminProcedure.query(async () => {
      return await db.getAllEmailCampaigns();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string(),
        subject: z.string(),
        content: z.string(),
        type: z.enum(['newsletter', 'promotion', 'blog_notification', 'welcome']),
        scheduledFor: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const campaign = await db.createEmailCampaign({
          ...input,
          status: input.scheduledFor ? 'scheduled' : 'draft',
        });
        return campaign;
      }),

    send: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { sendPromotionalEmail } = await import('./sendgrid');
        const subscribers = await db.getActiveNewsletterSubscribers();
        const campaigns = await db.getAllEmailCampaigns();
        const campaign = campaigns.find(c => c.id === input.id);
        
        if (!campaign) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
        }
        
        // Send emails to all active subscribers
        const emails = subscribers.map(s => s.email);
        await sendPromotionalEmail(emails, {
          subject: campaign.subject,
          content: campaign.content,
        });
        
        // Mark as sent
        await db.markCampaignAsSent(input.id, subscribers.length);
        
        return { success: true, recipientCount: subscribers.length };
      }),
  }),

  discountCodes: router({
    // Public endpoint to validate discount code
    validate: publicProcedure
      .input(z.object({
        code: z.string(),
        purchaseAmount: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.validateDiscountCode(input.code, input.purchaseAmount);
      }),

    // Admin endpoints
    getAll: adminProcedure.query(async () => {
      return await db.getAllDiscountCodes();
    }),

    create: adminProcedure
      .input(z.object({
        code: z.string(),
        discountType: z.enum(["percentage", "fixed"]),
        discountValue: z.string(),
        minPurchaseAmount: z.string().optional(),
        maxUses: z.number().optional(),
        subscriberEmail: z.string().optional(),
        expiresAt: z.date().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createDiscountCode(input);
      }),
  }),

  // ========== Abandoned Cart Recovery ==========
  abandonedCart: router({
    // Save or update abandoned cart
    save: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        customerEmail: z.string().optional(),
        customerName: z.string().optional(),
        cartData: z.array(z.any()),
        cartTotal: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.saveAbandonedCart(input);
      }),

    // Get abandoned cart by session ID
    getBySession: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return await db.getAbandonedCartBySession(input.sessionId);
      }),

    // Mark cart as recovered (called after successful checkout)
    markRecovered: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        await db.markCartRecovered(input.sessionId);
        return { success: true };
      }),

    // Admin: Get all abandoned carts
    getAll: adminProcedure
      .query(async () => {
        return await db.getAllAbandonedCarts();
      }),

    // Admin: Get statistics
    getStats: adminProcedure
      .query(async () => {
        return await db.getAbandonedCartStats();
      }),

    // Admin: Send reminder email to specific cart
    sendReminder: adminProcedure
      .input(z.object({ cartId: z.number() }))
      .mutation(async ({ input }) => {
        const { sendAbandonedCartEmail } = await import('./abandonedCartEmail');
        const cart = await db.getAbandonedCartById(input.cartId);
        
        if (!cart || !cart.customerEmail) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cart not found or no email' });
        }

        const success = await sendAbandonedCartEmail(
          cart.customerEmail,
          cart.customerName || 'Customer',
          cart.cartData,
          cart.cartTotal,
          cart.sessionId
        );

        if (success) {
          await db.markReminderSent(cart.id);
        }

        return { success };
      }),

    // Admin: Send reminder emails manually to all
    sendReminders: adminProcedure
      .mutation(async () => {
        const { sendAbandonedCartEmail } = await import('./abandonedCartEmail');
        const carts = await db.getAbandonedCartsForReminder();
        let sentCount = 0;

        for (const cart of carts) {
          if (cart.customerEmail && cart.customerName) {
            const success = await sendAbandonedCartEmail(
              cart.customerEmail,
              cart.customerName,
              cart.cartData,
              cart.cartTotal,
              cart.sessionId
            );

            if (success) {
              await db.markReminderSent(cart.id);
              sentCount++;
            }
          }
        }

        return { sentCount, totalCarts: carts.length };
      }),
  }),

  // ========== Shop the Look (Outfits) ==========
  outfits: router({
    // Get all active outfits for public display
    getActive: publicProcedure
      .query(async () => {
        return await db.getActiveOutfits();
      }),

    // Get outfit by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getOutfitById(input.id);
      }),

    // Admin: Get all outfits
    getAll: adminProcedure
      .query(async () => {
        return await db.getAllOutfits();
      }),

    // Admin: Create outfit
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        image: z.string().optional(),
        productIds: z.array(z.number()),
        totalPrice: z.number(),
        isActive: z.boolean().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createOutfit(input);
      }),

    // Admin: Update outfit
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        image: z.string().optional(),
        productIds: z.array(z.number()).optional(),
        totalPrice: z.number().optional(),
        isActive: z.boolean().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateOutfit(id, updates);
      }),

    // Admin: Delete outfit
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteOutfit(input.id);
        return { success: true };
      }),
  }),

  // Testimonials endpoints
  testimonials: router({
    // Public: Get featured testimonials
    getFeatured: publicProcedure.query(async () => {
      return await db.getFeaturedTestimonials();
    }),
    // Public: Get all testimonials
    getAll: publicProcedure.query(async () => {
      return await db.getAllTestimonials();
    }),
    // Admin: Create testimonial
    create: adminProcedure
      .input(z.object({
        customerName: z.string(),
        customerPhoto: z.string().optional(),
        rating: z.number().min(1).max(5),
        quote: z.string(),
        productId: z.number().optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createTestimonial(input);
        return { success: true };
      }),
    // Admin: Update testimonial
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        customerName: z.string().optional(),
        customerPhoto: z.string().optional(),
        rating: z.number().min(1).max(5).optional(),
        quote: z.string().optional(),
        productId: z.number().optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateTestimonial(id, updates);
        return { success: true };
      }),
    // Admin: Delete testimonial
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTestimonial(input.id);
        return { success: true };
      }),
  }),

  wishlist: router({
    // Get user's wishlist
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserWishlist(ctx.user.openId);
    }),
    // Get wishlist with full product details
    getWithProducts: protectedProcedure.query(async ({ ctx }) => {
      return await db.getWishlistWithProducts(ctx.user.openId);
    }),
    // Add product to wishlist
    add: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.addToWishlist(ctx.user.openId, input.productId);
        return { success: true };
      }),
    // Remove product from wishlist
    remove: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.removeFromWishlist(ctx.user.openId, input.productId);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;;

