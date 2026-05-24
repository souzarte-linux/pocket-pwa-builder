-- Migration to support small and large packages separation
ALTER TABLE routes ADD COLUMN small_packages_count integer DEFAULT 0;
ALTER TABLE routes ADD COLUMN large_packages_count integer DEFAULT 0;
ALTER TABLE routes ADD COLUMN large_packages_prices jsonb DEFAULT '[]'::jsonb;

-- Populate existing package_count to small_packages_count for backwards compatibility
UPDATE routes SET small_packages_count = package_count WHERE product_type = 'pacote';
