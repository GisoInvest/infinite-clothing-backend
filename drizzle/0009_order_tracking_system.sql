-- Add new fields to orders table for order tracking system
ALTER TABLE `orders` MODIFY COLUMN `status` enum('pending','processing','in_production','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `shippingCarrier` varchar(100);
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `estimatedDelivery` date;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `tapstitchOrderId` varchar(255);
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `internalNotes` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `statusHistory` json DEFAULT ('[]');
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `canBeCancelled` boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `cancellationDeadline` timestamp;
