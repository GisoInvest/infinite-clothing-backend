CREATE TABLE IF NOT EXISTS `userInteractions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `sessionId` varchar(100) NOT NULL,
  `eventType` enum('page_view', 'product_click', 'add_to_cart', 'remove_from_cart', 'add_to_wishlist', 'remove_from_wishlist', 'checkout_start', 'checkout_complete', 'search', 'filter_applied', 'form_submission', 'button_click') NOT NULL,
  `eventData` json,
  `page` varchar(255) NOT NULL,
  `timestamp` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_sessionId` (`sessionId`),
  INDEX `idx_eventType` (`eventType`),
  INDEX `idx_timestamp` (`timestamp`)
);
