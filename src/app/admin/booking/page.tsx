'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';

interface ContentEntry {
  key: string;
  valueEt: string;
  valueEn: string;
}

interface AddOnEntry {
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

type TopSector = 'texts' | 'loader' | 'addons' | 'preview';

const textSections = [
  {
    id: 'service',
    title: 'Teenuse valik',
    description: 'Teenuse sammu sonumid ja vaiketekstid.',
    keys: [
      'service_step_motivation',
      'service_addons_title',
      'service_default_result',
      'service_default_longevity',
      'service_default_suitability',
      'service_addon_hint',
    ],
  },
  {
    id: 'availability',
    title: 'Aja valik',
    description: 'Kuupaeva ja kellaaja sammu sonumid.',
    keys: [
      'availability_popularity_hint',
      'availability_sos_today',
      'availability_near_sold_out',
      'availability_selected',
      'availability_no_slots',
      'availability_next_available',
      'availability_try_another',
      'availability_continue',
      'availability_select_for_continue',
    ],
  },
  {
    id: 'contact',
    title: 'Kontakt ja ettevalmistus',
    description: 'Usaldus- ja ettevalmistustekstid.',
    keys: [
      'contact_step_hint',
      'preparation_title',
      'preparation_helper',
      'preparation_tip_1',
      'preparation_tip_2',
      'preparation_tip_3',
      'phone_default_country_code',
      'phone_field_helper',
    ],
  },
  {
    id: 'ai',
    title: 'AI teadmised',
    description: 'Chat-assistendi taust ja brändikontekst.',
    keys: [
      'ai_knowledge_specialist_name',
      'ai_knowledge_specialist_role',
      'ai_knowledge_owner_name',
      'ai_knowledge_brand_about',
      'ai_knowledge_location',
      'ai_knowledge_guideline',
    ],
  },
  {
    id: 'upload',
    title: 'Foto uleslaadimine',
    description: 'Inspiratsioonifoto ploki sonumid.',
    keys: [
      'upload_title',
      'upload_helper',
      'upload_cta',
      'upload_inspiration_optional_label',
      'upload_current_optional_label',
      'upload_optional_helper',
      'upload_skip_reassurance',
    ],
  },
  {
    id: 'success',
    title: 'Kinnitusleht',
    description: 'Pohisonumid peale edukat broneerimist.',
    keys: [
      'success_headline',
      'success_subheadline',
      'success_summary_title',
      'success_next_steps_title',
      'success_next_steps_helper',
      'success_primary_cta',
      'success_secondary_cta',
      'success_contact_cta',
    ],
  },
] as const;

const loaderKeys = [
  'loader_headline',
  'loader_helper',
  'loader_enable_global',
  'loader_enable_intro',
  'loader_enable_route_loader',
  'loader_enable_skeletons',
  'loader_enable_booking_transitions',
  'loader_enable_image_reveal',
  'loader_theme',
] as const;

function safe(value: string | undefined) {
  return (value ?? '').trim();
}

function prettyKey(key: string) {
  return key.replaceAll('_', ' ');
}

export default function AdminBookingContentPage() {
  const [content, setContent] = useState<ContentEntry[]>([]);
  const [addOns, setAddOns] = useState<AddOnEntry[]>([]);
  const [previewLocale, setPreviewLocale] = useState<'et' | 'en'>('et');
  const [activeSector, setActiveSector] = useState<TopSector>('texts');
  const [activeTextSectionId, setActiveTextSectionId] = useState<(typeof textSections)[number]['id']>(
    textSections[0].id
  );
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contentByKey = useMemo(
    () =>
      content.reduce<Record<string, ContentEntry>>((acc, item) => {
        acc[item.key] = item;
        return acc;
      }, {}),
    [content]
  );

  const activeTextSection = useMemo(
    () => textSections.find((section) => section.id === activeTextSectionId) ?? textSections[0],
    [activeTextSectionId]
  );

  const previewText = (key: string, fallbackEt: string, fallbackEn: string) => {
    const entry = contentByKey[key];
    if (!entry) return previewLocale === 'en' ? fallbackEn : fallbackEt;
    const et = safe(entry.valueEt);
    const en = safe(entry.valueEn);
    return previewLocale === 'en' ? en || et || fallbackEn : et || fallbackEt || en;
  };

  const previewAddOns = useMemo(() => {
    return addOns
      .filter((item) => item.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, 4)
      .map((item) => ({
        ...item,
        displayName: previewLocale === 'en' ? safe(item.nameEn) || item.nameEt : item.nameEt,
      }));
  }, [addOns, previewLocale]);

  const contentFlag = (key: string, fallback = true) => {
    const raw = previewLocale === 'en' ? safe(contentByKey[key]?.valueEn) : safe(contentByKey[key]?.valueEt);
    if (!raw) return fallback;
    return raw === '1' || raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  };

  const load = async () => {
    const [contentResponse, addOnsResponse] = await Promise.all([
      fetch('/api/booking-content?admin=1', { cache: 'no-store' }),
      fetch('/api/booking-addons?admin=1', { cache: 'no-store' }),
    ]);

    if (!contentResponse.ok || !addOnsResponse.ok) throw new Error('Andmeid ei saanud laadida');

    const contentData = (await contentResponse.json()) as { content?: ContentEntry[] };
    const addOnsData = (await addOnsResponse.json()) as { addOns?: AddOnEntry[] };
    setContent(contentData.content ?? []);
    setAddOns(addOnsData.addOns ?? []);
  };

  useEffect(() => {
    void load().catch(() => setError('Bookingu seadeid ei saanud laadida.'));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setContentValue = (key: string, field: 'valueEt' | 'valueEn', value: string) => {
    setContent((prev) => prev.map((entry) => (entry.key === key ? { ...entry, [field]: value } : entry)));
  };

  const saveContent = async () => {
    setIsSavingContent(true);
    setError(null);
    try {
      const response = await fetch('/api/booking-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: content }),
      });
      if (!response.ok) throw new Error('save failed');
      setToast('Bookingu tekstid salvestatud');
    } catch {
      setError('Bookingu tekstide salvestamine ebaonnestus.');
    } finally {
      setIsSavingContent(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="type-overline admin-muted">Broneerimine</p>
              <h1 className="type-h2 admin-heading mt-1">Broneerimise tekstid ja lisateenused</h1>
              <p className="type-small admin-muted mt-2">Muuda broneerimise sammude tekste ja lisateenuseid.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link className="btn-secondary btn-secondary-md" href="/admin">Halduspaneel</Link>
              <Link className="btn-secondary btn-secondary-md" href="/admin/bookings">Broneeringud</Link>
            </div>
          </div>
        </header>

        <AdminQuickActions />

        {toast ? <div className="fixed right-4 top-6 z-[70] rounded-xl border border-[#edd9e3] bg-white px-4 py-2 text-sm font-medium text-[#6a3b57] shadow-lg">{toast}</div> : null}
        {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <section className="rounded-2xl border border-[#e5e7eb] bg-white mb-6 p-4 shadow-sm">
          <p className="mb-3 type-small admin-muted">Vali vaade</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button onClick={() => setActiveSector('texts')} className={`rounded-2xl border px-4 py-3 text-left transition ${activeSector === 'texts' ? 'border-[var(--color-primary)] bg-[#fff2fa]' : 'border-[var(--color-border-card-soft)] bg-white hover:bg-[#fef8fb]'}`}>
              <p className="text-sm font-semibold admin-heading">Tekstid</p>
              <p className="text-xs admin-muted">Sammude sõnumid</p>
            </button>
            <button onClick={() => setActiveSector('addons')} className={`rounded-2xl border px-4 py-3 text-left transition ${activeSector === 'addons' ? 'border-[var(--color-primary)] bg-[#fff2fa]' : 'border-[var(--color-border-card-soft)] bg-white hover:bg-[#fef8fb]'}`}>
              <p className="text-sm font-semibold admin-heading">Lisateenused</p>
              <p className="text-xs admin-muted">Hinnad ja kestused</p>
            </button>
            <button onClick={() => setActiveSector('loader')} className={`rounded-2xl border px-4 py-3 text-left transition ${activeSector === 'loader' ? 'border-[var(--color-primary)] bg-[#fff2fa]' : 'border-[var(--color-border-card-soft)] bg-white hover:bg-[#fef8fb]'}`}>
              <p className="text-sm font-semibold admin-heading">Laadimise tekstid</p>
              <p className="text-xs admin-muted">Enne broneerimist</p>
            </button>
            <button onClick={() => setActiveSector('preview')} className={`rounded-2xl border px-4 py-3 text-left transition ${activeSector === 'preview' ? 'border-[var(--color-primary)] bg-[#fff2fa]' : 'border-[var(--color-border-card-soft)] bg-white hover:bg-[#fef8fb]'}`}>
              <p className="text-sm font-semibold admin-heading">Eelvaade</p>
              <p className="text-xs admin-muted">Kuidas kliendil näeb</p>
            </button>
          </div>
        </section>

        {activeSector === 'texts' && (
          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#111827]">Bookingu tekstid</h2>
                <p className="text-sm text-[#4b5563]">Vali alasektsioon ja muuda ainult vajalikke valju.</p>
              </div>
              <button onClick={() => void saveContent()} disabled={isSavingContent} className="rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {isSavingContent ? 'Salvestan...' : 'Salvesta tekstid'}
              </button>
            </div>

            <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {textSections.map((section) => (
                <button key={section.id} onClick={() => setActiveTextSectionId(section.id)} className={`rounded-2xl border px-3 py-2 text-left ${activeTextSection.id === section.id ? 'border-[#c490b2] bg-[#fff2fa]' : 'border-[#e9dce6] bg-white'}`}>
                  <p className="text-sm font-semibold text-[#3b2b3f]">{section.title}</p>
                </button>
              ))}
            </div>

            <article className="rounded-2xl border border-[#ebdfd7] bg-white p-4">
              <h3 className="text-base font-semibold text-[#111827]">{activeTextSection.title}</h3>
              <p className="mt-1 text-sm text-[#7a6572]">{activeTextSection.description}</p>
              <div className="mt-4 space-y-4">
                {activeTextSection.keys.map((key) => (
                  <div key={key} className="rounded-xl border border-[#efe3dc] bg-[#fffdfb] p-3">
                    <p className="mb-1 text-sm font-semibold text-[#4f3f46]">{prettyKey(key)}</p>
                    <p className="mb-2 text-xs text-[#8f7784]">{prettyKey(key)}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-medium text-[#4f3f46]">
                        Eesti keel
                        <input value={contentByKey[key]?.valueEt ?? ''} onChange={(event) => setContentValue(key, 'valueEt', event.target.value)} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                      </label>
                      <label className="text-sm font-medium text-[#4f3f46]">
                        English version
                        <input value={contentByKey[key]?.valueEn ?? ''} onChange={(event) => setContentValue(key, 'valueEn', event.target.value)} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {activeSector === 'loader' && (
          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[#111827]">Loaderi seaded</h2>
              <button onClick={() => void saveContent()} disabled={isSavingContent} className="rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {isSavingContent ? 'Salvestan...' : 'Salvesta'}
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#ebdfd7] bg-white p-4">
                {loaderKeys.slice(0, 2).map((key) => (
                  <label key={key} className="mt-2 block text-sm font-medium text-[#4f3f46]">
                    {prettyKey(key)}
                    <input value={contentByKey[key]?.valueEt ?? ''} onChange={(event) => setContentValue(key, 'valueEt', event.target.value)} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                  </label>
                ))}
              </div>
              <div className="rounded-2xl border border-[#ebdfd7] bg-white p-4">
                {loaderKeys.slice(2, 8).map((key) => (
                  <label key={key} className="mt-2 flex items-center justify-between rounded-xl border border-[#efe3dc] bg-[#fffdfb] px-3 py-2 text-sm text-[#4f3f46]">
                    {prettyKey(key)}
                    <input
                      type="checkbox"
                      checked={contentFlag(key)}
                      onChange={(event) => {
                        const value = event.target.checked ? '1' : '0';
                        setContentValue(key, 'valueEt', value);
                        setContentValue(key, 'valueEn', value);
                      }}
                    />
                  </label>
                ))}
                <label className="mt-3 block text-sm font-medium text-[#4f3f46]">
                  Teema
                  <select value={safe(contentByKey.loader_theme?.valueEt) || 'blush'} onChange={(event) => {
                    setContentValue('loader_theme', 'valueEt', event.target.value);
                    setContentValue('loader_theme', 'valueEn', event.target.value);
                  }} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]">
                    <option value="blush">Blush</option>
                    <option value="cream">Cream</option>
                    <option value="rose">Rose</option>
                  </select>
                </label>
              </div>
            </div>
          </section>
        )}

        {activeSector === 'addons' && (
          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold text-[#111827]">Lisateenused</h2>
            <p className="text-sm text-[#4b5563]">
              Lisateenused on nuud seotud konkreetse pohiteenusega.
            </p>
            <p className="mt-2 text-sm text-[#4b5563]">
              Lisa, muuda ja kustuta lisateenuseid lehel <code>/admin/services</code>, iga teenuse sees eraldi.
            </p>
            <div className="mt-4">
              <Link
                href="/admin/services"
                className="inline-flex rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#4b5563] hover:bg-[#f9fafb]"
              >
                Ava teenuste haldus
              </Link>
            </div>
          </section>
        )}

        {activeSector === 'preview' && (
          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#111827]">Booking Content Preview</h2>
              <div className="rounded-full border border-[#d1d5db] bg-white p-1 text-xs">
                <button type="button" onClick={() => setPreviewLocale('et')} className={`rounded-full px-3 py-1 ${previewLocale === 'et' ? 'bg-[#111827] text-white' : 'text-[#4b5563]'}`}>ET</button>
                <button type="button" onClick={() => setPreviewLocale('en')} className={`rounded-full px-3 py-1 ${previewLocale === 'en' ? 'bg-[#111827] text-white' : 'text-[#4b5563]'}`}>EN</button>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#efe3dc] bg-[#fffaf7] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Globaalne loader</p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">{previewText('loader_headline', 'Laeme sinu kogemust...', 'Preparing your experience...')}</p>
                <p className="mt-1 text-xs text-[#4b5563]">{previewText('loader_helper', 'Hetk, kohe oleme valmis.', 'Just a moment, almost ready.')}</p>
              </div>
              <div className="rounded-2xl border border-[#efe3dc] bg-[#fffaf7] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Ajavalik</p>
                <p className="mt-1 text-sm text-[#4b5563]">{previewText('availability_popularity_hint', 'Selle nadala uks valitumaid aegu otsustatakse just siin.', 'One of this week most selected time windows is decided right here.')}</p>
                <div className="mt-2 rounded-lg border border-[#f2d8e7] bg-[#fff5fb] px-2 py-1 text-xs text-[#8b4f71]">{previewText('availability_sos_today', 'Kiire aeg saadaval tana.', 'Urgent slot available today.')}</div>
              </div>
              <div className="rounded-2xl border border-[#efe3dc] bg-[#fffaf7] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">Lisateenused</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {previewAddOns.map((item) => (
                    <span key={item.id} className="rounded-full border border-[#e8d7cf] bg-white px-2.5 py-1 text-xs text-[#7d685d]">
                      {item.displayName} (+{item.price} EUR)
                    </span>
                  ))}
                  {previewAddOns.length === 0 ? <span className="text-xs text-[#7d685d]">Aktiivseid lisateenuseid pole.</span> : null}
                </div>
              </div>
              <div className="rounded-2xl border border-[#f1e2ea] bg-white/88 p-3 shadow-[0_-14px_24px_-24px_rgba(124,82,109,0.34)]">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[#6b7280]">Sticky CTA</p>
                <button className="w-full rounded-xl bg-[#111827] py-2 text-sm font-semibold text-white">{previewText('sticky_cta_label', 'Broneeri aeg', 'Book appointment')}</button>
                <p className="mt-1 text-center text-[11px] text-[#7d6586]">{previewText('sticky_cta_helper', 'Vaata vabu aegu', 'See available times')}</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
