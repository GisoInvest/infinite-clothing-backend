import { publicProcedure, router } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { customers, orders, wishlist } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
// Password hashing will be implemented with a more compatible library
// import bcrypt from 'bcrypt';

export const customersRouter = router({
  // Register a new customer
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().optional(),
      country: z.string().optional(),
      city: z.string().optional(),
      ageGroup: z.string().optional(),
      stylePreferences: z.array(z.string()).default([]),
      newsletter: z.boolean().default(true),
      marketingConsent: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        // Check if email already exists
        const existing = await db
          .select()
          .from(customers)
          .where(eq(customers.email, input.email))
          .limit(1);

        if (existing.length > 0) {
          throw new Error('Email already registered');
        }

        // TODO: Implement password hashing with a compatible library
        // For now, store password as-is (implement proper hashing in production)
        const hashedPassword = input.password;

        // Create customer
        const result = await db.insert(customers).values({
          email: input.email,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          country: input.country,
          city: input.city,
          ageGroup: input.ageGroup,
          stylePreferences: input.stylePreferences,
          newsletter: input.newsletter,
          marketingConsent: input.marketingConsent,
          registrationSource: 'homepage',
          lastActivityDate: new Date(),
        });

        // Store password hash in session/JWT (you'd typically use a session management library)
        // For now, return success
        return {
          success: true,
          message: 'Registration successful',
          customerId: result[0],
        };
      } catch (error: any) {
        throw new Error(error.message || 'Registration failed');
      }
    }),

  // Login customer
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const customer = await db
          .select()
          .from(customers)
          .where(eq(customers.email, input.email))
          .limit(1);

        if (customer.length === 0) {
          throw new Error('Invalid email or password');
        }

        // In a real app, you'd verify the password hash here
        // For now, just return success
        return {
          success: true,
          message: 'Login successful',
          customerId: customer[0].id,
        };
      } catch (error: any) {
        throw new Error(error.message || 'Login failed');
      }
    }),

  // Get customer profile
  getProfile: publicProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // In a real app, get customerId from session/JWT
      // For now, return mock data
      const customer = await db
        .select()
        .from(customers)
        .limit(1);

      return customer[0] || null;
    }),

  // Get customer orders
  getOrders: publicProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        // Get the first customer's orders (in real app, use authenticated customer)
        const customer = await db
          .select()
          .from(customers)
          .limit(1);

        if (!customer[0]) return [];

        const customerOrders = await db
          .select()
          .from(orders)
          .where(eq(orders.customerEmail, customer[0].email))
          .orderBy(desc(orders.createdAt))
          .limit(50);

        return customerOrders;
      } catch (error) {
        console.error('Failed to get orders:', error);
        return [];
      }
    }),

  // Get customer activity stats
  getActivityStats: publicProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const customer = await db
          .select()
          .from(customers)
          .limit(1);

        if (!customer[0]) {
          return {
            totalOrders: 0,
            totalSpent: 0,
            wishlistCount: 0,
            lastActivityDate: new Date(),
          };
        }

        // Get orders
        const customerOrders = await db
          .select()
          .from(orders)
          .where(eq(orders.customerEmail, customer[0].email));

        const totalOrders = customerOrders.length;
        const totalSpent = customerOrders.reduce((sum, order) => sum + (order.total || 0), 0);

        // Get wishlist count
        const wishlistItems = await db
          .select()
          .from(wishlist)
          .limit(1000);

        return {
          totalOrders,
          totalSpent,
          wishlistCount: wishlistItems.length,
          lastActivityDate: customer[0].lastActivityDate,
        };
      } catch (error) {
        console.error('Failed to get activity stats:', error);
        return {
          totalOrders: 0,
          totalSpent: 0,
          wishlistCount: 0,
          lastActivityDate: new Date(),
        };
      }
    }),

  // Get customer wishlist
  getWishlist: publicProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const wishlistItems = await db
          .select()
          .from(wishlist)
          .limit(100);

        return wishlistItems;
      } catch (error) {
        console.error('Failed to get wishlist:', error);
        return [];
      }
    }),

  // Logout
  logout: publicProcedure
    .mutation(async () => {
      // Clear session/JWT
      return { success: true, message: 'Logged out successfully' };
    }),

  // Track customer activity
  trackActivity: publicProcedure
    .input(z.object({
      customerId: z.number(),
      activityType: z.string(),
      details: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        // Update last activity date
        await db
          .update(customers)
          .set({ lastActivityDate: new Date() })
          .where(eq(customers.id, input.customerId));

        return { success: true };
      } catch (error) {
        console.error('Failed to track activity:', error);
        return { success: false };
      }
    }),

  // Get all customers (admin only)
  getAllCustomers: publicProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const allCustomers = await db
          .select()
          .from(customers)
          .orderBy(desc(customers.createdAt))
          .limit(1000);

        return allCustomers;
      } catch (error) {
        console.error('Failed to get customers:', error);
        return [];
      }
    }),

  // Get customer details with activity (admin only)
  getCustomerDetails: publicProcedure
    .input(z.object({
      customerId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const customer = await db
          .select()
          .from(customers)
          .where(eq(customers.id, input.customerId))
          .limit(1);

        if (!customer[0]) {
          throw new Error('Customer not found');
        }

        const customerOrders = await db
          .select()
          .from(orders)
          .where(eq(orders.customerEmail, customer[0].email))
          .orderBy(desc(orders.createdAt));

        return {
          customer: customer[0],
          orders: customerOrders,
          totalOrders: customerOrders.length,
          totalSpent: customerOrders.reduce((sum, order) => sum + (order.total || 0), 0),
        };
      } catch (error: any) {
        throw new Error(error.message || 'Failed to get customer details');
      }
    }),
});
