import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, products, Product, InsertProduct, orders, Order, InsertOrder, audioTracks, AudioTrack, InsertAudioTrack, siteSettings, SiteSetting, InsertSiteSetting, blogPosts, BlogPost, InsertBlogPost, productReviews, ProductReview, InsertProductReview, newsletterSubscribers, NewsletterSubscriber, InsertNewsletterSubscriber, emailCampaigns, EmailCampaign, InsertEmailCampaign, discountCodes, DiscountCode, InsertDiscountCode, abandonedCarts, AbandonedCart, InsertAbandonedCart, outfits, Outfit, InsertOutfit, testimonials, Testimonial, InsertTestimonial, wishlist, Wishlist, InsertWishlist } from "../drizzle/schema";
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
  console.log("CREATE_PRODUCT_DATA:", JSON.stringify(product));
  const db = await getDb();
  if (!db) throw new Error("Database not available");

    let result;
  try {
    result = await db.insert(products).values(product);
  } catch (error) {
    console.error("CREATE_PRODUCT_ERROR:", error);
    throw error;
  }
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

export async function getProductById(id: number): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (result.length === 0) return undefined;
  
  const product = result[0];
  // Ensure JSON fields are parsed as arrays
  return {
    ...product,
    colors: typeof product.colors === 'string' ? JSON.parse(product.colors) : product.colors,
    sizes: typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes,
    images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
    videos: typeof product.videos === 'string' ? JSON.parse(product.videos) : product.videos,

  };
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

  const results = await query.orderBy(desc(products.createdAt));
  
  // Ensure JSON fields are parsed as arrays
  return results.map(product => ({
    ...product,
    colors: typeof product.colors === 'string' ? JSON.parse(product.colors) : product.colors,
    sizes: typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes,
    images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
    videos: typeof product.videos === 'string' ? JSON.parse(product.videos) : product.videos,

  }));
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db.select().from(products)
    .where(and(eq(products.featured, true), eq(products.active, true)))
    .orderBy(desc(products.createdAt))
    .limit(8);
  
  // Ensure JSON fields are parsed as arrays
  return results.map(product => ({
    ...product,
    colors: typeof product.colors === 'string' ? JSON.parse(product.colors) : product.colors,
    sizes: typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes,
    images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
    videos: typeof product.videos === 'string' ? JSON.parse(product.videos) : product.videos,

  }));
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


// Site settings operations
export async function getSiteSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return result.length > 0 ? result[0].value : null;
}

export async function setSiteSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(siteSettings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: sql`CURRENT_TIMESTAMP` } });
}

export async function getBackgroundMusicEnabled(): Promise<boolean> {
  const value = await getSiteSetting('background_music_enabled');
  return value === 'true';
}

export async function setBackgroundMusicEnabled(enabled: boolean): Promise<void> {
  await setSiteSetting('background_music_enabled', enabled ? 'true' : 'false');
}

// Blog post operations
export async function createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(blogPosts).values(post);
  const insertedId = Number(result[0].insertId);
  
  const newPost = await db.select().from(blogPosts).where(eq(blogPosts.id, insertedId)).limit(1);
  return newPost[0];
}

export async function updateBlogPost(id: number, updates: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(blogPosts).set(updates).where(eq(blogPosts.id, id));
  
  const updated = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : undefined;
}

export async function deleteBlogPost(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.delete(blogPosts).where(eq(blogPosts.id, id));
  return result[0].affectedRows > 0;
}

export async function getBlogPost(id: number): Promise<BlogPost | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
}

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(blogPosts)
    .where(and(
      eq(blogPosts.status, 'published'),
      sql`${blogPosts.publishedAt} <= NOW()`
    ))
    .orderBy(desc(blogPosts.publishedAt));
}

export async function getBlogPostsByCategory(category: string): Promise<BlogPost[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(blogPosts)
    .where(and(
      eq(blogPosts.category, category),
      eq(blogPosts.status, 'published')
    ))
    .orderBy(desc(blogPosts.publishedAt));
}

export async function incrementBlogPostViews(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(blogPosts)
    .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
    .where(eq(blogPosts.id, id));
}

// Product review operations
export async function createProductReview(review: InsertProductReview): Promise<ProductReview> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(productReviews).values(review);
  const insertedId = Number(result[0].insertId);
  
  const newReview = await db.select().from(productReviews).where(eq(productReviews.id, insertedId)).limit(1);
  return newReview[0];
}

export async function getProductReviews(productId: number): Promise<ProductReview[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(productReviews)
    .where(and(
      eq(productReviews.productId, productId),
      eq(productReviews.status, "approved")
    ))
    .orderBy(desc(productReviews.createdAt));
}

export async function getProductAverageRating(productId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const reviews = await db.select().from(productReviews)
    .where(and(
      eq(productReviews.productId, productId),
      eq(productReviews.status, "approved")
    ));

  if (reviews.length === 0) return 0;
  
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10; // Round to 1 decimal
}

export async function incrementReviewHelpful(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(productReviews)
    .set({ helpfulCount: sql`${productReviews.helpfulCount} + 1` })
    .where(eq(productReviews.id, id));
}

export async function deleteProductReview(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.delete(productReviews).where(eq(productReviews.id, id));
  return result[0].affectedRows > 0;
}

// Newsletter subscriber operations
export async function createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(newsletterSubscribers).values(subscriber);
  const insertedId = Number(result[0].insertId);
  
  const newSubscriber = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.id, insertedId)).limit(1);
  return newSubscriber[0];
}

export async function getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function confirmNewsletterSubscription(token: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.update(newsletterSubscribers)
    .set({ status: "active", confirmedAt: new Date() })
    .where(eq(newsletterSubscribers.confirmationToken, token));
  
  return result[0].affectedRows > 0;
}

export async function unsubscribeNewsletter(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.update(newsletterSubscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(newsletterSubscribers.email, email));
  
  return result[0].affectedRows > 0;
}

export async function getActiveNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "active"));
}

// Email campaign operations
export async function createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(emailCampaigns).values(campaign);
  const insertedId = Number(result[0].insertId);
  
  const newCampaign = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, insertedId)).limit(1);
  return newCampaign[0];
}

export async function updateEmailCampaign(id: number, updates: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(emailCampaigns).set(updates).where(eq(emailCampaigns.id, id));
  
  const updated = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id)).limit(1);
  return updated.length > 0 ? updated[0] : undefined;
}

export async function getAllEmailCampaigns(): Promise<EmailCampaign[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.createdAt));
}

export async function markCampaignAsSent(id: number, recipientCount: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(emailCampaigns)
    .set({ status: "sent", sentAt: new Date(), recipientCount })
    .where(eq(emailCampaigns.id, id));
}

// ========== Discount Codes ==========

export async function createDiscountCode(code: InsertDiscountCode): Promise<DiscountCode> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(discountCodes).values(code);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(discountCodes).where(eq(discountCodes.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted discount code");
  
  return inserted[0];
}

export async function getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(discountCodes).where(eq(discountCodes.code, code)).limit(1);
  return result[0];
}

export async function validateDiscountCode(code: string, purchaseAmount: number): Promise<{ valid: boolean; discount?: DiscountCode; error?: string }> {
  const db = await getDb();
  if (!db) return { valid: false, error: "Database not available" };
  
  const discount = await getDiscountCodeByCode(code);
  
  if (!discount) {
    return { valid: false, error: "Invalid discount code" };
  }
  
  if (!discount.isActive) {
    return { valid: false, error: "This discount code is no longer active" };
  }
  
  if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
    return { valid: false, error: "This discount code has expired" };
  }
  
  if (discount.usedCount >= discount.maxUses) {
    return { valid: false, error: "This discount code has reached its usage limit" };
  }
  
  const minAmount = Number(discount.minPurchaseAmount);
  if (purchaseAmount < minAmount) {
    return { valid: false, error: `Minimum purchase amount of £${(minAmount / 100).toFixed(2)} required` };
  }
  
  return { valid: true, discount };
}

export async function incrementDiscountCodeUsage(codeId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(discountCodes)
    .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
    .where(eq(discountCodes.id, codeId));
}

export async function generateUniqueDiscountCode(prefix: string = "WELCOME"): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `${prefix}${randomSuffix}`;
    
    const existing = await getDiscountCodeByCode(code);
    if (!existing) {
      return code;
    }
    
    attempts++;
  }
  
  throw new Error("Failed to generate unique discount code");
}

export async function getAllDiscountCodes(): Promise<DiscountCode[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
}

// ========== Abandoned Carts ==========

export async function saveAbandonedCart(cart: InsertAbandonedCart): Promise<AbandonedCart> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if cart already exists for this session
  const existing = await db.select().from(abandonedCarts).where(eq(abandonedCarts.sessionId, cart.sessionId)).limit(1);
  
  if (existing[0]) {
    // Update existing cart
    await db.update(abandonedCarts)
      .set({
        cartData: cart.cartData,
        cartTotal: cart.cartTotal,
        customerEmail: cart.customerEmail,
        customerName: cart.customerName,
        lastUpdated: new Date(),
      })
      .where(eq(abandonedCarts.sessionId, cart.sessionId));
    
    const updated = await db.select().from(abandonedCarts).where(eq(abandonedCarts.sessionId, cart.sessionId)).limit(1);
    return updated[0];
  } else {
    // Create new cart
    const result = await db.insert(abandonedCarts).values(cart);
    const insertedId = Number(result[0].insertId);
    
    const inserted = await db.select().from(abandonedCarts).where(eq(abandonedCarts.id, insertedId)).limit(1);
    if (!inserted[0]) throw new Error("Failed to retrieve inserted abandoned cart");
    
    return inserted[0];
  }
}

export async function getAbandonedCartsForReminder(): Promise<AbandonedCart[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get carts that are:
  // 1. Not recovered
  // 2. No reminder sent yet
  // 3. Last updated more than 24 hours ago
  // 4. Have customer email
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  return db.select().from(abandonedCarts)
    .where(
      and(
        eq(abandonedCarts.recovered, false),
        eq(abandonedCarts.reminderSent, false),
        sql`${abandonedCarts.lastUpdated} < ${twentyFourHoursAgo}`,
        sql`${abandonedCarts.customerEmail} IS NOT NULL`
      )
    )
    .orderBy(desc(abandonedCarts.lastUpdated));
}

export async function markReminderSent(cartId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(abandonedCarts)
    .set({
      reminderSent: true,
      reminderSentAt: new Date(),
    })
    .where(eq(abandonedCarts.id, cartId));
}

export async function markCartRecovered(sessionId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(abandonedCarts)
    .set({
      recovered: true,
      recoveredAt: new Date(),
    })
    .where(eq(abandonedCarts.sessionId, sessionId));
}

export async function getAbandonedCartBySession(sessionId: string): Promise<AbandonedCart | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(abandonedCarts).where(eq(abandonedCarts.sessionId, sessionId)).limit(1);
  return result[0];
}

export async function getAllAbandonedCarts(): Promise<AbandonedCart[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(abandonedCarts).orderBy(desc(abandonedCarts.lastUpdated));
}

// ========== Outfits (Shop the Look) ==========

export async function createOutfit(outfit: InsertOutfit): Promise<Outfit> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(outfits).values(outfit);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(outfits).where(eq(outfits.id, insertedId)).limit(1);
  if (!inserted[0]) throw new Error("Failed to retrieve inserted outfit");
  
  return inserted[0];
}

export async function getActiveOutfits(): Promise<Outfit[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(outfits)
    .where(eq(outfits.isActive, true))
    .orderBy(outfits.displayOrder, desc(outfits.createdAt));
}

export async function getAllOutfits(): Promise<Outfit[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(outfits).orderBy(outfits.displayOrder, desc(outfits.createdAt));
}

export async function getOutfitById(id: number): Promise<Outfit | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(outfits).where(eq(outfits.id, id)).limit(1);
  return result[0];
}

export async function updateOutfit(id: number, updates: Partial<InsertOutfit>): Promise<Outfit> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(outfits).set(updates).where(eq(outfits.id, id));
  
  const updated = await db.select().from(outfits).where(eq(outfits.id, id)).limit(1);
  if (!updated[0]) throw new Error("Failed to retrieve updated outfit");
  
  return updated[0];
}

export async function deleteOutfit(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(outfits).where(eq(outfits.id, id));
}


// ===== Testimonials =====
export async function getFeaturedTestimonials() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(testimonials)
    .where(and(eq(testimonials.featured, true), eq(testimonials.active, true)))
    .orderBy(desc(testimonials.createdAt));
}

export async function getAllTestimonials() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(testimonials)
    .where(eq(testimonials.active, true))
    .orderBy(desc(testimonials.createdAt));
}

export async function createTestimonial(data: InsertTestimonial) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(testimonials).values(data);
}

export async function updateTestimonial(id: number, data: Partial<InsertTestimonial>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(testimonials).set(data).where(eq(testimonials.id, id));
}

export async function deleteTestimonial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(testimonials).set({ active: false }).where(eq(testimonials.id, id));
}


export async function getAbandonedCartById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(abandonedCarts)
    .where(eq(abandonedCarts.id, id))
    .limit(1);
  
  return result[0] || null;
}

export async function getAbandonedCartStats() {
  const db = await getDb();
  if (!db) return {
    totalAbandoned: 0,
    totalValue: 0,
    recoveryRate: 0,
    remindersSent: 0,
    mostAbandonedProducts: [],
  };
  
  const allCarts = await db.select().from(abandonedCarts);
  const totalAbandoned = allCarts.length;
  const totalValue = allCarts.reduce((sum, cart) => sum + cart.cartTotal, 0);
  const recovered = allCarts.filter(cart => cart.recovered).length;
  const recoveryRate = totalAbandoned > 0 ? (recovered / totalAbandoned) * 100 : 0;
  const remindersSent = allCarts.filter(cart => cart.reminderSent).length;
  
  // Calculate most abandoned products
  const productCounts: Record<number, { productId: number; productName: string; count: number }> = {};
  
  allCarts.forEach(cart => {
    cart.cartData.forEach((item: any) => {
      if (!productCounts[item.productId]) {
        productCounts[item.productId] = {
          productId: item.productId,
          productName: item.productName,
          count: 0,
        };
      }
      productCounts[item.productId].count++;
    });
  });
  
  const mostAbandonedProducts = Object.values(productCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return {
    totalAbandoned,
    totalValue,
    recoveryRate,
    remindersSent,
    mostAbandonedProducts,
  };
}


// Wishlist functions
export async function addToWishlist(userId: string, productId: number) {
  const db = await getDb();
  if (!db) return null;
  
  await db.insert(wishlist).values({ userId, productId });
  return true;
}

export async function removeFromWishlist(userId: string, productId: number) {
  const db = await getDb();
  if (!db) return null;
  
  await db.delete(wishlist).where(
    and(
      eq(wishlist.userId, userId),
      eq(wishlist.productId, productId)
    )
  );
  return true;
}

export async function getUserWishlist(userId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(wishlist).where(eq(wishlist.userId, userId));
}

export async function getWishlistWithProducts(userId: string) {
  const db = await getDb();
  if (!db) return [];
  
  const wishlistItems = await db
    .select({
      wishlistId: wishlist.id,
      productId: wishlist.productId,
      createdAt: wishlist.createdAt,
      product: products,
    })
    .from(wishlist)
    .leftJoin(products, eq(wishlist.productId, products.id))
    .where(eq(wishlist.userId, userId));
  
  return wishlistItems;
}
