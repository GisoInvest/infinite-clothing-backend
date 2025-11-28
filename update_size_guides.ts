import { getDb } from "./server/db";
import { products } from "./drizzle/schema";
import { eq, inArray } from "drizzle-orm";

// Standard US Size Guide Data
const US_SIZE_GUIDE_DATA = {
  "men": {
    "S": "Chest: 34-36 in, Waist: 28-30 in, Inseam: 30 in",
    "M": "Chest: 38-40 in, Waist: 32-34 in, Inseam: 31 in",
    "L": "Chest: 42-44 in, Waist: 36-38 in, Inseam: 32 in",
    "XL": "Chest: 46-48 in, Waist: 40-42 in, Inseam: 33 in",
    "2XL": "Chest: 50-52 in, Waist: 44-46 in, Inseam: 34 in"
  },
  "women": {
    "XS": "Bust: 32-33 in, Waist: 24-25 in, Hips: 34-35 in",
    "S": "Bust: 34-35 in, Waist: 26-27 in, Hips: 36-37 in",
    "M": "Bust: 36-37 in, Waist: 28-29 in, Hips: 38-39 in",
    "L": "Bust: 38-40 in, Waist: 30-32 in, Hips: 40-42 in",
    "XL": "Bust: 41-43 in, Waist: 33-35 in, Hips: 43-45 in"
  },
  "unisex": {
    "S": "Chest: 34-36 in, Waist: 28-30 in",
    "M": "Chest: 38-40 in, Waist: 32-34 in",
    "L": "Chest: 42-44 in, Waist: 36-38 in",
    "XL": "Chest: 46-48 in, Waist: 40-42 in",
    "2XL": "Chest: 50-52 in, Waist: 44-46 in"
  }
};

async function updateSizeGuides() {
  console.log("Starting size guide update script...");
  
  // NOTE: This script assumes the database is running and accessible.
  // In a real scenario, this would be run as a one-off migration or a seed script.
  
  const db = await getDb();
  if (!db) {
    console.error("Database not available. Ensure DATABASE_URL is set and the database is running.");
    return;
  }

  try {
    // 1. Fetch all existing products
    const allProducts = await db.select().from(products);
    console.log(`Found ${allProducts.length} products.`);

    let updatedCount = 0;

    for (const product of allProducts) {
      // Determine the correct size guide based on the product category
      let guideToApply: Record<string, string> = {};
      
      switch (product.category) {
        case 'men':
          guideToApply = US_SIZE_GUIDE_DATA.men;
          break;
        case 'women':
          guideToApply = US_SIZE_GUIDE_DATA.women;
          break;
        case 'unisex':
          guideToApply = US_SIZE_GUIDE_DATA.unisex;
          break;
        default:
          // Skip products with other categories (e.g., kids-baby) for now
          continue;
      }

      // Check if the product's sizeGuide is already set (not the default empty object)
      // This prevents overwriting a guide that might have been manually entered.
      if (Object.keys(product.sizeGuide).length === 0) {
        await db.update(products)
          .set({ sizeGuide: guideToApply })
          .where(eq(products.id, product.id));
        
        console.log(`Updated size guide for Product ID ${product.id} (${product.name}) - Category: ${product.category}`);
        updatedCount++;
      }
    }

    console.log(`\nSuccessfully updated size guides for ${updatedCount} products.`);
    console.log("Script finished.");

  } catch (error) {
    console.error("An error occurred during the update:", error);
  }
}

updateSizeGuides();
