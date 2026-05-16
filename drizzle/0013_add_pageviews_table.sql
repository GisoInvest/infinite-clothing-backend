CREATE TABLE IF NOT EXISTS `pageViews` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `sessionId` varchar(100) NOT NULL,
  `page` varchar(255) NOT NULL,
  `referrer` varchar(500),
  `userAgent` text,
  `ipAddress` varchar(50),
  `country` varchar(100),
  `city` varchar(100),
  `deviceType` enum('mobile', 'tablet', 'desktop') NOT NULL,
  `timestamp` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_sessionId` (`sessionId`),
  INDEX `idx_page` (`page`),
  INDEX `idx_timestamp` (`timestamp`)
);
