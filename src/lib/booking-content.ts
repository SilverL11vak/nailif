import { sql } from './db';
import type { LocaleCode } from './i18n/locale-path';
import type { AddOn } from '@/store/booking-types';

export type BookingContentKey =
  | 'availability_popularity_hint'
  | 'availability_sos_today'
  | 'availability_near_sold_out'
  | 'availability_autoselect'
  | 'availability_selected'
  | 'availability_no_slots'
  | 'availability_next_available'
  | 'availability_try_another'
  | 'availability_pattern_hint'
  | 'availability_month_helper'
  | 'availability_show_more_days'
  | 'availability_next_suggestion'
  | 'availability_fully_booked_week'
  | 'availability_browse_future_weeks'
  | 'availability_continue'
  | 'availability_select_for_continue'
  | 'smart_recommended_title'
  | 'smart_badge_popular'
  | 'smart_badge_today'
  | 'smart_badge_best_fit'
  | 'smart_badge_almost_full'
  | 'smart_settings_urgency_boost'
  | 'smart_settings_discount_enabled'
  | 'smart_settings_maintenance_weeks'
  | 'smart_settings_gap_sensitivity'
  | 'smart_settings_reorder'
  | 'service_step_motivation'
  | 'service_addons_title'
  | 'contact_step_hint'
  | 'ai_knowledge_specialist_name'
  | 'ai_knowledge_specialist_role'
  | 'ai_knowledge_owner_name'
  | 'ai_knowledge_brand_about'
  | 'ai_knowledge_location'
  | 'ai_knowledge_guideline'
  | 'contact_optional_nails_title'
  | 'preparation_tip_1'
  | 'preparation_tip_2'
  | 'preparation_tip_3'
  | 'preparation_title'
  | 'preparation_helper'
  | 'upload_title'
  | 'upload_helper'
  | 'upload_cta'
  | 'upload_inspiration_optional_label'
  | 'upload_current_optional_label'
  | 'upload_optional_helper'
  | 'upload_skip_reassurance'
  | 'upload_replace'
  | 'upload_remove'
  | 'upload_note_label'
  | 'upload_size_error'
  | 'upload_failed_error'
  | 'phone_default_country_code'
  | 'phone_field_helper'
  | 'sticky_cta_label'
  | 'sticky_cta_helper'
  | 'loader_headline'
  | 'loader_helper'
  | 'loader_enable_global'
  | 'loader_enable_intro'
  | 'loader_enable_route_loader'
  | 'loader_enable_skeletons'
  | 'loader_enable_booking_transitions'
  | 'loader_enable_image_reveal'
  | 'loader_theme'
  | 'service_default_result'
  | 'service_default_longevity'
  | 'service_default_suitability'
  | 'service_include_label'
  | 'service_learn_more'
  | 'service_see_details'
  | 'service_choose_time_cta'
  | 'service_chip_materials'
  | 'service_chip_shape'
  | 'service_maintenance_hint'
  | 'service_client_favourite'
  | 'service_last_booked_hint'
  | 'service_modal_preparation'
  | 'service_modal_aftercare'
  | 'service_modal_result'
  | 'service_addon_hint'
  | 'confirm_expectation_title'
  | 'confirm_expectation_1'
  | 'confirm_expectation_2'
  | 'confirm_expectation_3'
  | 'confirm_expectation_4'
  | 'repeat_booking_title'
  | 'repeat_booking_helper'
  | 'repeat_booking_button'
  | 'repeat_booking_skip'
  | 'repeat_booking_weeks'
  | 'success_headline'
  | 'success_subheadline'
  | 'success_summary_title'
  | 'success_next_steps_title'
  | 'success_next_steps_helper'
  | 'success_technician_label'
  | 'success_retention_title'
  | 'success_retention_helper'
  | 'success_upsell_title'
  | 'success_upsell_subtitle'
  | 'success_upsell_product'
  | 'success_upsell_addon'
  | 'success_upsell_gift'
  | 'success_primary_cta'
  | 'success_secondary_cta'
  | 'success_contact_cta';

interface DefaultContentItem {
  key: BookingContentKey;
  et: string;
  en: string;
}

const defaultContent: DefaultContentItem[] = [
  { key: 'availability_popularity_hint', et: 'Selle nädala üks valitumaid aegu otsustatakse just siin.', en: 'One of this week’s most selected time windows is decided right here.' },
  { key: 'availability_sos_today', et: 'Kiire aeg saadaval täna.', en: 'Urgent slot available today.' },
  { key: 'availability_near_sold_out', et: 'Ainult 2 aega järel.', en: 'Only 2 slots left.' },
  { key: 'availability_autoselect', et: 'Hea valik. Leidsime sulle sobiva aja automaatselt.', en: 'Great choice. We preselected a suitable time for you.' },
  { key: 'availability_selected', et: 'Aeg valitud. Liigume edasi.', en: 'Time selected. Let’s continue.' },
  { key: 'availability_no_slots', et: 'Sellel kuupäeval pole vabu aegu.', en: 'No slots available on this date.' },
  { key: 'availability_next_available', et: 'Järgmine vaba aeg', en: 'Next available time' },
  { key: 'availability_try_another', et: 'Vaata järgmisi kuupäevi.', en: 'See future dates.' },
  { key: 'availability_pattern_hint', et: 'Uued ajad avanevad regulaarselt igal nädalal.', en: 'New slots are released regularly every week.' },
  { key: 'availability_month_helper', et: 'Vali sobiv aeg. Kui soovid hilisemat aega, liigu järgmisse kuusse.', en: 'Choose a suitable time. You can browse future months.' },
  { key: 'availability_show_more_days', et: 'Näita rohkem päevi', en: 'Show more days' },
  { key: 'availability_next_suggestion', et: 'Järgmine soovituslik aeg', en: 'Next suggested time' },
  { key: 'availability_fully_booked_week', et: 'See nädal on täis broneeritud.', en: 'This week is fully booked.' },
  { key: 'availability_browse_future_weeks', et: 'Sirvi järgmisi nädalaid', en: 'Browse future weeks' },
  { key: 'availability_continue', et: 'Jätkan enesekindlalt', en: 'Continue confidently' },
  { key: 'availability_select_for_continue', et: 'Vali aeg jätkamiseks', en: 'Select time to continue' },
  { key: 'smart_recommended_title', et: 'Soovitatud ajad', en: 'Recommended times' },
  { key: 'smart_badge_popular', et: 'Populaarne aeg', en: 'Popular time' },
  { key: 'smart_badge_today', et: 'Viimane vaba aeg täna', en: 'Last available slot today' },
  { key: 'smart_badge_best_fit', et: 'Parim sobivus teenusele', en: 'Best fit for selected service' },
  { key: 'smart_badge_almost_full', et: 'Peaaegu täis', en: 'Almost full' },
  { key: 'smart_settings_urgency_boost', et: '1', en: '1' },
  { key: 'smart_settings_discount_enabled', et: '0', en: '0' },
  { key: 'smart_settings_maintenance_weeks', et: '4', en: '4' },
  { key: 'smart_settings_gap_sensitivity', et: '2', en: '2' },
  { key: 'smart_settings_reorder', et: '1', en: '1' },
  { key: 'service_step_motivation', et: 'Oled vaid ühe sammu kaugusel uutest kaunitest küüntest.', en: 'You are one step away from your next beautiful nails.' },
  { key: 'service_addons_title', et: 'Lisa soovi korral kohe juurde:', en: 'Add optional enhancements right away:' },
  { key: 'contact_step_hint', et: 'Oled vaid ühe sammu kaugusel kinnitamisest.', en: 'You are one step away from confirmation.' },
  { key: 'contact_optional_nails_title', et: 'Kiire info sinu küünte kohta (valikuline)', en: 'Optional info about your nails' },
  { key: 'preparation_tip_1', et: 'Tasuta ümberbroneerimine', en: 'Free rescheduling' },
  { key: 'preparation_tip_2', et: 'Kiire kinnitus', en: 'Fast confirmation' },
  { key: 'preparation_tip_3', et: 'Sertifitseeritud küünetehnik', en: 'Certified nail technician' },
  { key: 'preparation_title', et: 'Enne visiiti', en: 'Before your appointment' },
  { key: 'preparation_helper', et: 'Puhasta küüned ja väldi samal päeval tugevatoimelisi õlisid.', en: 'Clean nails and avoid strong oils on the same day.' },
  { key: 'upload_title', et: 'Inspiratsioon või praeguse küüne foto', en: 'Inspiration or current nail photo' },
  { key: 'upload_helper', et: 'Näita meile inspiratsiooni. Lisa praeguste küünte pilt paremaks konsultatsiooniks.', en: 'Show us your inspiration. Upload your current nails for better consultation.' },
  { key: 'upload_cta', et: 'Lisa foto seadmest', en: 'Upload photo from device' },
  { key: 'upload_replace', et: 'Asenda foto', en: 'Replace photo' },
  { key: 'upload_remove', et: 'Eemalda foto', en: 'Remove photo' },
  { key: 'upload_note_label', et: 'Lisa märkus (valikuline)', en: 'Add note (optional)' },
  { key: 'upload_size_error', et: 'Pilt on liiga suur (max 3 MB).', en: 'Image is too large (max 3 MB).' },
  { key: 'upload_failed_error', et: 'Pildi lisamine ebaõnnestus.', en: 'Image upload failed.' },
  { key: 'upload_inspiration_optional_label', et: 'Lisa inspiratsioonipilt (valikuline)', en: 'Add inspiration photo (optional)' },
  { key: 'upload_current_optional_label', et: 'Lisa pilt praegustest küüntest (valikuline)', en: 'Add a photo of your current nails (optional)' },
  { key: 'upload_optional_helper', et: 'Soovi korral saad lisada pildi, et saaksime visiidi paremini ette valmistada.', en: 'You can add a photo if you want us to prepare your appointment better.' },
  { key: 'upload_skip_reassurance', et: 'Võid jätkata ka ilma pildita.', en: 'You can continue without uploading any photo.' },
  { key: 'phone_default_country_code', et: '+372', en: '+372' },
  { key: 'phone_field_helper', et: 'Sisesta number koos suunakoodiga. Vajadusel muuda riigikoodi.', en: 'Enter your phone with country code. You can change the prefix if needed.' },
  { key: 'sticky_cta_label', et: 'Broneeri aeg', en: 'Book appointment' },
  { key: 'sticky_cta_helper', et: 'Vaata vabu aegu', en: 'See available times' },
  { key: 'loader_headline', et: 'Laeme sinu kogemust...', en: 'Preparing your experience...' },
  { key: 'loader_helper', et: 'Hetk, kohe oleme valmis.', en: 'Just a moment, almost ready.' },
  { key: 'loader_enable_global', et: '1', en: '1' },
  { key: 'loader_enable_intro', et: '1', en: '1' },
  { key: 'loader_enable_route_loader', et: '1', en: '1' },
  { key: 'loader_enable_skeletons', et: '1', en: '1' },
  { key: 'loader_enable_booking_transitions', et: '1', en: '1' },
  { key: 'loader_enable_image_reveal', et: '1', en: '1' },
  { key: 'loader_theme', et: 'blush', en: 'blush' },
  { key: 'service_default_result', et: 'Kaunis, hoolikalt viimistletud tulemus.', en: 'Beautifully finished premium result.' },
  { key: 'service_default_longevity', et: 'Püsivus: individuaalne', en: 'Longevity: personalized' },
  { key: 'service_default_suitability', et: 'Sobivus: kohandatud sinu vajadusele', en: 'Suitability: tailored to your needs' },
  { key: 'service_include_label', et: 'Sisaldab', en: 'Includes' },
  { key: 'service_learn_more', et: 'Vaata lähemalt', en: 'Learn more' },
  { key: 'service_see_details', et: 'Vaata detaile', en: 'See details' },
  { key: 'service_choose_time_cta', et: 'Vali aeg', en: 'Choose time' },
  { key: 'service_chip_materials', et: 'Premium materjalid', en: 'Premium materials' },
  { key: 'service_chip_shape', et: 'Personaalne kuju', en: 'Personalized shape' },
  { key: 'service_maintenance_hint', et: 'Hooldus iga 3-4 nädala järel', en: 'Maintenance every 3-4 weeks' },
  { key: 'service_client_favourite', et: 'Kliendi lemmik', en: 'Client favourite' },
  { key: 'service_last_booked_hint', et: 'Viimati broneeritud 18 min tagasi', en: 'Last booked 18 min ago' },
  { key: 'service_modal_preparation', et: 'Ettevalmistus: tule puhaste küüntega. Kui vajad geeli eemaldust, lisa see teenusena.', en: 'Preparation: arrive with clean nails. If gel removal is needed, add removal service.' },
  { key: 'service_modal_aftercare', et: 'Järelhooldus: kasuta küüneõli iga päev ja väldi tugevaid kemikaale, et läige püsiks.', en: 'Aftercare: use cuticle oil daily and avoid harsh chemicals for long-lasting shine.' },
  { key: 'service_modal_result', et: 'Realistlik tulemus: lõplik toon ja viimistlus kinnitatakse Sandraga enne töö algust.', en: 'Realistic result: final tone and finish are confirmed with Sandra before work starts.' },
  { key: 'service_addon_hint', et: 'Soovid lisada disaini või paranduse? Lisad selle järgmises sammus.', en: 'Want to add nail art or repair? You can add it in the next step.' },
  { key: 'confirm_expectation_title', et: 'Enne visiiti', en: 'Before your visit' },
  { key: 'confirm_expectation_1', et: 'Tule puhaste küüntega. Kui vajad geeli eemaldust, lisa see teenusena.', en: 'Arrive with clean nails. If you need gel removal, add it as a service.' },
  { key: 'confirm_expectation_2', et: 'Inspiratsioonipilt aitab meil paremini ette valmistada, kuid on valikuline.', en: 'An inspiration photo helps us prepare better, but it is optional.' },
  { key: 'confirm_expectation_3', et: 'Teenuse kestus võib detailidest sõltuvalt veidi muutuda.', en: 'Service duration can vary slightly depending on details.' },
  { key: 'confirm_expectation_4', et: 'Lõplik hind kinnitatakse enne töö algust.', en: 'Final price is confirmed before the service starts.' },
  { key: 'repeat_booking_title', et: 'Soovid järgmise hoolduse juba ette broneerida?', en: 'Would you like to reserve your next maintenance appointment?' },
  { key: 'repeat_booking_helper', et: 'Soovituslik vahemik on 3 kuni 4 nädalat.', en: 'Recommended window is 3 to 4 weeks.' },
  { key: 'repeat_booking_button', et: 'Broneeri järgmine aeg', en: 'Book next appointment' },
  { key: 'repeat_booking_skip', et: 'Praegu mitte', en: 'Skip for now' },
  { key: 'repeat_booking_weeks', et: '4', en: '4' },
  { key: 'success_headline', et: 'Suurepärane, sinu aeg on kinnitatud!', en: 'Great, your appointment is confirmed!' },
  { key: 'success_subheadline', et: 'Kohtumiseni stuudios. Saadame peagi ka kinnituse.', en: 'See you at the studio. We will also send your confirmation shortly.' },
  { key: 'success_summary_title', et: 'Sinu broneering', en: 'Your booking details' },
  { key: 'success_next_steps_title', et: 'Mis juhtub järgmisena', en: 'What happens next' },
  { key: 'success_next_steps_helper', et: 'Kontrollime andmed üle ja valmistame visiidi ette. Vajadusel võtame ühendust.', en: 'We review your details and prepare your appointment. We contact you if needed.' },
  { key: 'success_technician_label', et: 'Tehnik', en: 'Technician' },
  { key: 'success_retention_title', et: 'Soovid järgmise hoolduse juba ette broneerida?', en: 'Would you like to reserve your next maintenance appointment?' },
  { key: 'success_retention_helper', et: 'Soovitame hooldusaja planeerida 3-4 nädala pärast.', en: 'We recommend planning your next maintenance visit in 3-4 weeks.' },
  { key: 'success_upsell_title', et: 'Soovid tulemust veel kauem hoida?', en: 'Want to keep the result beautiful for longer?' },
  { key: 'success_upsell_subtitle', et: 'Vali sobiv lisa kohe, et järgmine visiit oleks veel sujuvam.', en: 'Choose an add-on now to make your next visit even smoother.' },
  { key: 'success_upsell_product', et: 'Järelhooldustooted', en: 'Aftercare products' },
  { key: 'success_upsell_addon', et: 'Küünte tugevdamise lisad', en: 'Nail strengthening add-ons' },
  { key: 'success_upsell_gift', et: 'Kinkekaardid', en: 'Gift cards' },
  { key: 'success_primary_cta', et: 'Tagasi avalehele', en: 'Back to homepage' },
  { key: 'success_secondary_cta', et: 'Vaata teenuseid', en: 'View services' },
  { key: 'ai_knowledge_specialist_name', et: 'Sandra Samun', en: 'Sandra Samun' },
  { key: 'ai_knowledge_specialist_role', et: 'Sertifitseeritud kuunetehnik', en: 'Certified nail technician' },
  { key: 'ai_knowledge_owner_name', et: 'Sandra Samun', en: 'Sandra Samun' },
  { key: 'ai_knowledge_brand_about', et: 'Nailify on premium kuunehoolduse stuudio, mis keskendub personaalsetele tulemustele, puhtale tookeskkonnale ja rahulikule kliendikogemusele.', en: 'Nailify is a premium nail care studio focused on personalized results, clean standards and a calm client experience.' },
  { key: 'ai_knowledge_location', et: 'Mustamae stuudio, Tallinn', en: 'Mustamae studio, Tallinn' },
  { key: 'ai_knowledge_guideline', et: 'Kui kusimus vajab loplikku kinnitust, suuna klient otse kuunetehnikule.', en: 'If final confirmation is needed, direct the client to the technician.' },
  { key: 'success_contact_cta', et: 'Võta salongiga ühendust', en: 'Contact the salon' },
];

function localize(locale: LocaleCode, et: string, en: string) {
  return locale === 'en' ? (en || et) : (et || en);
}

declare global {
  var __nailify_booking_content_ensure__: Promise<void> | undefined;
}

let bookingContentEnsurePromise: Promise<void> | null =
  global.__nailify_booking_content_ensure__ ?? null;

async function ensureBookingContentTablesInternal() {
  await sql`
    CREATE TABLE IF NOT EXISTS booking_content (
      key TEXT PRIMARY KEY,
      value_et TEXT NOT NULL DEFAULT '',
      value_en TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS booking_addons (
      id TEXT PRIMARY KEY,
      name_et TEXT NOT NULL,
      name_en TEXT NOT NULL DEFAULT '',
      description_et TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      duration INTEGER NOT NULL DEFAULT 0,
      price INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const [{ count: bookingContentCount }] = await sql<[{ count: string }]>`
    SELECT COUNT(*)::text AS count FROM booking_content
  `;

  if (Number(bookingContentCount) === 0) {
    for (const item of defaultContent) {
      await sql`
        INSERT INTO booking_content (key, value_et, value_en)
        VALUES (${item.key}, ${item.et}, ${item.en})
        ON CONFLICT (key) DO NOTHING
      `;
    }
  }

  const [{ count: addOnCount }] = await sql<[{ count: string }]>`
    SELECT COUNT(*)::text AS count FROM booking_addons
  `;

  if (Number(addOnCount) === 0) {
    const seed: Array<Omit<BookingAddOnRecord, 'active'> & { active: boolean }> = [
      {
        id: 'nail-art',
        nameEt: 'Küünedisain',
        nameEn: 'Nail art',
        descriptionEt: 'Isikupärased detailid ja aktsendid sinu stiili järgi.',
        descriptionEn: 'Personalized details and accents tailored to your style.',
        duration: 15,
        price: 12,
        sortOrder: 1,
        active: true,
      },
      {
        id: 'repair',
        nameEt: 'Parandus',
        nameEn: 'Repair',
        descriptionEt: 'Kiire korrigeerimine murdunud või nõrgenenud küünele.',
        descriptionEn: 'Fast fix for broken or weakened nails.',
        duration: 10,
        price: 8,
        sortOrder: 2,
        active: true,
      },
      {
        id: 'chrome-finish',
        nameEt: 'Kroomviimistlus',
        nameEn: 'Chrome finish',
        descriptionEt: 'Luksuslik peegelläige viimaseks viimistluseks.',
        descriptionEn: 'Luxurious mirror shine as a final finish.',
        duration: 10,
        price: 10,
        sortOrder: 3,
        active: true,
      },
      {
        id: 'french-detail',
        nameEt: 'French detail',
        nameEn: 'French detail',
        descriptionEt: 'Puhas klassikaline joon elegantseks tulemuseks.',
        descriptionEn: 'Clean classic line for an elegant result.',
        duration: 10,
        price: 9,
        sortOrder: 4,
        active: true,
      },
    ];

    for (const item of seed) {
      await upsertBookingAddOn(item);
    }
  }
}

export async function ensureBookingContentTables() {
  if (!bookingContentEnsurePromise) {
    bookingContentEnsurePromise = ensureBookingContentTablesInternal();
    global.__nailify_booking_content_ensure__ = bookingContentEnsurePromise;
  }
  await bookingContentEnsurePromise;
}

export async function listBookingContent(locale: LocaleCode): Promise<Record<BookingContentKey, string>> {
  const rows = await sql<{ key: BookingContentKey; value_et: string; value_en: string }[]>`
    SELECT key, value_et, value_en
    FROM booking_content
  `;

  const content = {} as Record<BookingContentKey, string>;
  for (const item of defaultContent) {
    content[item.key] = localize(locale, item.et, item.en);
  }

  for (const row of rows) {
    content[row.key] = localize(locale, row.value_et, row.value_en);
  }

  return content;
}

export async function listAdminBookingContent(): Promise<Array<{ key: BookingContentKey; valueEt: string; valueEn: string }>> {
  const rows = await sql<{ key: BookingContentKey; value_et: string; value_en: string }[]>`
    SELECT key, value_et, value_en
    FROM booking_content
    ORDER BY key ASC
  `;

  const map = new Map(rows.map((row) => [row.key, row]));
  return defaultContent.map((item) => {
    const row = map.get(item.key);
    return {
      key: item.key,
      valueEt: row?.value_et ?? item.et,
      valueEn: row?.value_en ?? item.en,
    };
  });
}

export async function upsertBookingContent(entries: Array<{ key: BookingContentKey; valueEt: string; valueEn: string }>) {
  for (const entry of entries) {
    await sql`
      INSERT INTO booking_content (key, value_et, value_en)
      VALUES (${entry.key}, ${entry.valueEt}, ${entry.valueEn})
      ON CONFLICT (key) DO UPDATE SET
        value_et = EXCLUDED.value_et,
        value_en = EXCLUDED.value_en,
        updated_at = NOW()
    `;
  }
}

export interface BookingAddOnRecord {
  id: string;
  nameEt: string;
  nameEn: string;
  descriptionEt: string;
  descriptionEn: string;
  duration: number;
  price: number;
  sortOrder: number;
  active: boolean;
}

export async function listBookingAddOns(locale: LocaleCode): Promise<AddOn[]> {
  const rows = await sql<{
    id: string;
    name_et: string;
    name_en: string;
    description_et: string;
    description_en: string;
    duration: number;
    price: number;
    active: boolean;
  }[]>`
    SELECT id, name_et, name_en, description_et, description_en, duration, price, active
    FROM booking_addons
    WHERE active = TRUE
    ORDER BY sort_order ASC, created_at ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    name: localize(locale, row.name_et, row.name_en),
    duration: row.duration,
    price: row.price,
    description: localize(locale, row.description_et, row.description_en),
    selected: false,
  }));
}

export async function listAdminBookingAddOns(): Promise<BookingAddOnRecord[]> {
  const rows = await sql<{
    id: string;
    name_et: string;
    name_en: string;
    description_et: string;
    description_en: string;
    duration: number;
    price: number;
    sort_order: number;
    active: boolean;
  }[]>`
    SELECT id, name_et, name_en, description_et, description_en, duration, price, sort_order, active
    FROM booking_addons
    ORDER BY sort_order ASC, created_at ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    nameEt: row.name_et,
    nameEn: row.name_en,
    descriptionEt: row.description_et,
    descriptionEn: row.description_en,
    duration: row.duration,
    price: row.price,
    sortOrder: row.sort_order,
    active: row.active,
  }));
}

export async function upsertBookingAddOn(input: BookingAddOnRecord) {
  await sql`
    INSERT INTO booking_addons (
      id, name_et, name_en, description_et, description_en, duration, price, sort_order, active
    ) VALUES (
      ${input.id},
      ${input.nameEt},
      ${input.nameEn},
      ${input.descriptionEt},
      ${input.descriptionEn},
      ${input.duration},
      ${input.price},
      ${input.sortOrder},
      ${input.active}
    )
    ON CONFLICT (id) DO UPDATE SET
      name_et = EXCLUDED.name_et,
      name_en = EXCLUDED.name_en,
      description_et = EXCLUDED.description_et,
      description_en = EXCLUDED.description_en,
      duration = EXCLUDED.duration,
      price = EXCLUDED.price,
      sort_order = EXCLUDED.sort_order,
      active = EXCLUDED.active,
      updated_at = NOW()
  `;
}

export async function deleteBookingAddOn(id: string) {
  await sql`DELETE FROM booking_addons WHERE id = ${id}`;
}
