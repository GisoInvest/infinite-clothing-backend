CREATE TABLE IF NOT EXISTS `activitySummary` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `date` date NOT NULL UNIQUE,
  `totalPageViews` int DEFAULT 0 NOT NULL,
  `uniqueVisitors` int DEFAULT 0 NOT NULL,
  `totalAddToCart` int DEFAULT 0 NOT NULL,
  `totalCheckouts` int DEFAULT 0 NOT NULL,
  `totalOrders` int DEFAULT 0 NOT NULL,
  `totalRevenue` int DEFAULT 0 NOT NULL,
  `mostViewedPage` varchar(255),
  `topProduct` int,
  `averageSessionDuration` int DEFAULT 0 NOT NULL,
  `bounceRate` decimal(5, 2) DEFAULT 0.00 NOT NULL,
  `timestamp` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_date` (`date`)
);
