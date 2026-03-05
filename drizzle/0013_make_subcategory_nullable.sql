-- Make subcategory column nullable to allow products without a subcategory
ALTER TABLE products MODIFY COLUMN subcategory VARCHAR(100) NULL;
