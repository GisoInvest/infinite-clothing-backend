-- Fix statusHistory column to remove invalid default value
ALTER TABLE `orders` MODIFY COLUMN `statusHistory` json;
