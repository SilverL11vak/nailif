-- 009_seed_data.sql
-- Initial seed data for services and homepage media
-- Uses ON CONFLICT to preserve existing data

-- Seed default services
INSERT INTO services (id, name, name_et, name_en, description, description_et, description_en, duration, price, category, is_popular, sort_order, active) VALUES
('gel-manicure', 'Gel Manicure', 'Geel küüneplaadi hooldus', 'Gel Manicure', 'Long-lasting gel polish application', 'Pikaajaline geellaki küntamine', 'Long-lasting gel polish application', 45, 35, 'manicure', true, 1, true),
('luxury-spa-manicure', 'Luxury Spa Manicure', 'Luksus spa maniküür', 'Luxury Spa Manicure', 'Full spa experience with massage', 'Täis spa kogemus massaažiga', 'Full spa experience with massage', 60, 55, 'manicure', true, 2, true),
('gel-pedicure', 'Gel Pedicure', 'Geel pediküür', 'Gel Pedicure', 'Gel polish for feet', 'Geellaki pediküür', 'Gel polish for feet', 45, 40, 'pedicure', false, 3, true),
('nail-art', 'Nail Art', 'Küünekunst', 'Nail Art', 'Custom nail art designs', 'Kohandatud küünekunsti disainid', 'Custom nail art designs', 30, 25, 'nail-art', true, 4, true)
ON CONFLICT (id) DO NOTHING;

-- Seed default homepage media
INSERT INTO homepage_media (key, label, section, image_url, media_type, sort_order) VALUES
('hero_main', 'Hero Main Photo', 'hero', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&q=80', 'image', 1),
('hero_fallback', 'Hero Fallback', 'hero', 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=1200&q=80', 'image', 2),
('gallery_fallback_1', 'Gallery Fallback 1', 'gallery', 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80', 'image', 20),
('gallery_fallback_2', 'Gallery Fallback 2', 'gallery', 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80', 'image', 21),
('team_portrait', 'Sandra Portrait', 'team', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&q=80', 'image', 30),
('location_studio', 'Studio Photo', 'location', 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=80', 'image', 50)
ON CONFLICT (key) DO NOTHING;
