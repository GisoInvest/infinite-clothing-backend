-- Add collection field to products table
ALTER TABLE `products` ADD COLUMN `collection` ENUM('regular', 'premium') NOT NULL DEFAULT 'regular' AFTER `price`;
