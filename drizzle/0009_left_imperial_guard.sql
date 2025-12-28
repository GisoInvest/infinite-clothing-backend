ALTER TABLE `orders` MODIFY COLUMN `status` enum('pending','processing','in_production','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `orders` ADD `paymentMethod` enum('stripe','crypto') DEFAULT 'stripe' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `cryptoPaymentId` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `cryptoCurrency` varchar(50);--> statement-breakpoint
ALTER TABLE `orders` ADD `cryptoAmount` varchar(100);--> statement-breakpoint
ALTER TABLE `orders` ADD `shippingCarrier` varchar(100);--> statement-breakpoint
ALTER TABLE `orders` ADD `estimatedDelivery` date;--> statement-breakpoint
ALTER TABLE `orders` ADD `tapstitchOrderId` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `internalNotes` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `statusHistory` json;--> statement-breakpoint
ALTER TABLE `orders` ADD `canBeCancelled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `cancellationDeadline` timestamp;