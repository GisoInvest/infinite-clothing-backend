import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, products, Product, InsertProduct, orders, Order, InsertOrder, audioTracks, AudioTrack, InsertAudioTrack } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Product operations
export async function createProduct(product: InsertProduct): Promise<Product> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(products).values(product);
  const insertedId = Number(result[0].insertId);
  
  const newProduct = await db.select().from(products).where(eq(products.id, insertedId)).limit(1);
  return newProduct[0];
}

export async function updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(products).set(updates).where(eq(products.id, id));
  
  const updated = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : undefined;
}

export async function deleteProduct(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.delete(products).where(eq(products.id, id));
  return result[0].affectedRows > 0;
}

export async function getProduct(id: number): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllProducts(filters?: {
  category?: string;
  subcategory?: string;
  active?: boolean;
}): Promise<Product[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db.select().from(products);
  
  const conditions = [];
  if (filters?.category) {
    conditions.push(eq(products.category, filters.category as any));
  }
  if (filters?.subcategory) {
    conditions.push(eq(products.subcategory, filters.subcategory));
  }
  if (filters?.active !== undefined) {
    conditions.push(eq(products.active, filters.active));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query.orderBy(desc(products.createdAt));
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(products)
    .where(and(eq(products.featured, true), eq(products.active, true)))
    .orderBy(desc(products.createdAt))
    .limit(8);
}

// Order operations
export async function createOrder(order: InsertOrder): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(orders).values(order);
  const insertedId = Number(result[0].insertId);
  
  const newOrder = await db.select().from(orders).where(eq(orders.id, insertedId)).limit(1);
  return newOrder[0];
}

export async function updateOrder(id: number, updates: Partial<InsertOrder>): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(orders).set(updates).where(eq(orders.id, id));
  
  const updated = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : undefined;
}

export async function getOrder(id: number): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllOrders(): Promise<Order[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(orders)
    .where(eq(orders.customerEmail, email))
    .orderBy(desc(orders.createdAt));
}

// Audio track operations
export async function createAudioTrack(track: InsertAudioTrack): Promise<AudioTrack> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(audioTracks).values(track);
  const insertedId = Number(result[0].insertId);
  
  const newTrack = await db.select().from(audioTracks).where(eq(audioTracks.id, insertedId)).limit(1);
  return newTrack[0];
}

export async function updateAudioTrack(id: number, updates: Partial<InsertAudioTrack>): Promise<AudioTrack | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(audioTracks).set(updates).where(eq(audioTracks.id, id));
  
  const updated = await db.select().from(audioTracks).where(eq(audioTracks.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : undefined;
}

export async function deleteAudioTrack(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.delete(audioTracks).where(eq(audioTracks.id, id));
  return result[0].affectedRows > 0;
}

export async function getActiveAudioTracks(): Promise<AudioTrack[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(audioTracks)
    .where(eq(audioTracks.active, true))
    .orderBy(audioTracks.order);
}

export async function getAllAudioTracks(): Promise<AudioTrack[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(audioTracks).orderBy(audioTracks.order);
}

