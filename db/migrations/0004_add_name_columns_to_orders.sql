-- MIGRATION: Add name columns to orders for frontend compatibility
-- Data: 26/04/2026

SELECT add_column_if_not_exists('art_orders', 'designer_name', 'TEXT');
SELECT add_column_if_not_exists('video_orders', 'editor_name', 'TEXT');

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
