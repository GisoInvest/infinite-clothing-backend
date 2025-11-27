-- Migration script for adding sizeGuide column to products table

ALTER TABLE products ADD COLUMN sizeGuide json NOT NULL DEFAULT ('{}');
