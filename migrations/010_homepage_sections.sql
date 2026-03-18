-- 010_homepage_sections.sql
-- Homepage section text content - admin-editable with ET/EN support

-- Homepage sections table for editable text content
CREATE TABLE IF NOT EXISTS homepage_sections (
    id TEXT PRIMARY KEY,
    section_group TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    value_et TEXT NOT NULL DEFAULT '',
    value_en TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_group ON homepage_sections(section_group);
CREATE INDEX IF NOT EXISTS idx_homepage_sections_active ON homepage_sections(is_active);

-- Initial seed data: Location, Final CTA, Team sections
-- These match current JSON translations in et.json and en.json

-- Location section
INSERT INTO homepage_sections (id, section_group, sort_order, is_active, value_et, value_en) VALUES
('location_title', 'location', 1, true, 'Külastage meid', 'Visit Us'),
('location_subtitle', 'location', 2, true, 'Nailify Mustamäe stuudio pakub privaatset ja hubast keskkonda, kus teie küüned saavad tähelepanu, mida nad väärivad.', 'Nailify Mustamäe studio offers a private and cozy environment where your nails get the attention they deserve.'),
('location_preview_text', 'location', 3, true, 'Asume Mustamäe keskuse lähedal tasuta parkimisega.', 'Located near Mustamäe Keskus with free parking.'),
('location_mustamae', 'location', 4, true, 'Mustamäe, Tallinn', 'Mustamäe, Tallinn'),
('location_address', 'location', 5, true, 'Mustamäe tee 55, Tallinn', 'Mustamäe tee 55, Tallinn'),
('location_hours_weekday', 'location', 6, true, 'E - R: 9:00 - 19:00', 'Mon - Sat: 9am - 7pm'),
('location_hours_weekend', 'location', 7, true, 'P: 10:00 - 17:00', 'Sunday: 10am - 5pm'),
('location_transport', 'location', 8, true, '5 min kaugusel Mustamäe Keskusest, tasuta parkimine', '5 min from Mustamäe Keskus, free parking available'),
('location_get_directions', 'location', 9, true, 'Navigeeri', 'Get Directions'),
('location_badge1', 'location', 10, true, 'Tasuta parkimine', 'Free parking'),
('location_badge2', 'location', 11, true, 'Hubane stuudio', 'Cozy studio'),
('location_badge3', 'location', 12, true, 'Privaatne teenus', 'Private service'),
('location_badge4', 'location', 13, true, 'Kogenud tehnik', 'Experienced technician'),

-- Final CTA section
('cta_title', 'final_cta', 1, true, 'Valmis ilusate küünte jaoks?', 'Ready for Beautiful Nails?'),
('cta_subtitle', 'final_cta', 2, true, 'Broneerige oma aeg ja nautige Nailify erinevust.', 'Secure your slot and experience the Nailify difference.'),
('cta_most_clients', 'final_cta', 3, true, 'Enamik kliente naaseb 4 nädala jooksul', 'Most clients return within 4 weeks'),
('cta_free_reschedule', 'final_cta', 4, true, 'Tasuta ümberbroneerimine kui plaanid muutuvad', 'Free reschedule if plans change'),
('cta_book_button', 'final_cta', 5, true, 'Broneeri oma aeg', 'Secure Your Slot'),
('cta_browse_button', 'final_cta', 6, true, 'Vaata teenuseid', 'Browse Services'),

-- Team / Specialist section
('team_eyebrow', 'team', 1, true, 'Isiklik spetsialist', 'Personal specialist'),
('team_subtitle', 'team', 2, true, 'Sandra on kogenud küünetehnik, kes on spetsialiseerunud luksuslikele geelküüntele ja isikupärastatud disainile.', 'Sandra is an experienced nail technician specializing in luxury gel nails and personalized designs.'),
('team_exp', 'team', 3, true, '8+ aastat kogemust', '8+ years experience'),
('team_clients', 'team', 4, true, '1,200+ klienti', '1,200+ clients'),
('team_rating', 'team', 5, true, '4.9/5 hinnang', '4.9/5 rating'),
('team_benefit_1_title', 'team', 6, true, 'Isikupärane disain', 'Personalized design'),
('team_benefit_1_hint', 'team', 7, true, 'Kohandatud sinu käe kuju ja stiiliga.', 'Tailored to your hand shape and style.'),
('team_benefit_2_title', 'team', 8, true, 'Kauapüsiv tulemus', 'Long-lasting result'),
('team_benefit_2_hint', 'team', 9, true, 'Püsivus, mis hoiab läike nädalaid.', 'Durability that keeps shine for weeks.'),
('team_benefit_3_title', 'team', 10, true, 'Konsultatsioon enne hooldust', 'Consultation before service'),
('team_benefit_3_hint', 'team', 11, true, 'Selge plaan enne hoolduse algust.', 'Clear plan before your service starts.'),
('team_signature_label', 'team', 12, true, 'Signature stiil', 'Signature style'),
('team_results_label', 'team', 13, true, 'Päris töö tulemused', 'Real work results'),
('team_cta_strong', 'team', 14, true, 'Broneeri aeg Sandraga', 'Book with Sandra'),
('team_availability', 'team', 15, true, 'Vabu aegu sel nädalal', 'Available slots this week'),
('team_favorite_badge', 'team', 16, true, 'Kliendi lemmik', 'Client favourite'),
('team_image_alt', 'team', 17, true, 'Sandra Samun Nailify stuudios', 'Sandra Samun at Nailify studio')
ON CONFLICT (id) DO NOTHING;
