-- Migration: Make images, videos, colors, and sizes fields nullable (remove NOT NULL constraint)
ALTER TABLE products MODIFY COLUMN images JSON;
ALTER TABLE products MODIFY COLUMN videos JSON;
ALTER TABLE products MODIFY COLUMN colors JSON;
ALTER TABLE products MODIFY COLUMN sizes JSON;
