'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

type SectionRow = {
  id: string;
  valueEt: string;
  valueEn: string;
};

type DraftEntry = {
  valueEt: string;
  valueEn: string;
};

type EditableField = {
  id: string;
  sectionGroup: string;
  sortOrder: number;
  label: string;
  helper: string;
  defaultEt: string;
  defaultEn: string;
};

type FieldGroup = {
  id: string;
  title: string;
  description: string;
  fields: EditableField[];
};

const FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'trust',
    title: 'Usaldusread avalehel',
    description: 'Lühitekstid, mis kuvatakse avalehe usaldusridade juures.',
    fields: [
      { id: 'trust_rating_label', sectionGroup: 'homepage_meta', sortOrder: 10, label: 'Hinnangu tekst', helper: 'Nt: 4.9 hinnang', defaultEt: '4.9 hinnang', defaultEn: '4.9 rating' },
      { id: 'trust_google_rating', sectionGroup: 'homepage_meta', sortOrder: 20, label: 'Hinnangu lisatekst', helper: 'Nt: Google hinnang', defaultEt: 'Google hinnang', defaultEn: 'Google rating' },
      { id: 'trust_clients_label', sectionGroup: 'homepage_meta', sortOrder: 30, label: 'Klientide tekst', helper: 'Nt: 1200+ klienti', defaultEt: '1200+ klienti', defaultEn: '1200+ clients' },
      { id: 'trust_hygienic_tools_label', sectionGroup: 'homepage_meta', sortOrder: 40, label: 'Hügieeni tekst', helper: 'Nt: Hügieenilised tööriistad', defaultEt: 'Hügieenilised tööriistad', defaultEn: 'Hygienic tools' },
      { id: 'trust_studio_label', sectionGroup: 'homepage_meta', sortOrder: 50, label: 'Stuudio tekst', helper: 'Nt: Mustamäe stuudio', defaultEt: 'Mustamäe stuudio', defaultEn: 'Mustamae studio' },
    ],
  },
  {
    id: 'location',
    title: 'Asukoht',
    description: 'Aadress ja asukohaploki read.',
    fields: [
      { id: 'location_map_query', sectionGroup: 'homepage_meta', sortOrder: 60, label: 'Google Maps aadress', helper: 'Kaardilingi aadress', defaultEt: 'Mustamäe tee 55, Tallinn', defaultEn: 'Mustamae tee 55, Tallinn' },
      { id: 'local_authority_item_1', sectionGroup: 'homepage_meta', sortOrder: 70, label: 'Asukoha rida 1', helper: 'Nt: Mustamäe tee 55, Tallinn', defaultEt: 'Mustamäe tee 55, Tallinn', defaultEn: 'Mustamae tee 55, Tallinn' },
      { id: 'local_authority_item_2', sectionGroup: 'homepage_meta', sortOrder: 80, label: 'Asukoha rida 2', helper: 'Nt: Mugav parkimine', defaultEt: 'Mugav parkimine', defaultEn: 'Easy parking' },
      { id: 'local_authority_item_3', sectionGroup: 'homepage_meta', sortOrder: 90, label: 'Asukoha rida 3', helper: 'Nt: Hea ühistransport', defaultEt: 'Hea ühistransport', defaultEn: 'Easy public transport' },
    ],
  },
  {
    id: 'footer',
    title: 'Kontakt ja lahtiolek',
    description: 'Jaluse kontaktread, e-post ja lahtioleku info.',
    fields: [
      { id: 'footer_contact_line_1', sectionGroup: 'homepage_meta', sortOrder: 100, label: 'Kontaktirida 1', helper: 'Aadress või asukoht', defaultEt: 'Mustamäe tee 55, Tallinn', defaultEn: 'Mustamae tee 55, Tallinn' },
      { id: 'footer_contact_line_2', sectionGroup: 'homepage_meta', sortOrder: 110, label: 'Kontaktirida 2', helper: 'Telefon vms', defaultEt: '+372 5555 1234', defaultEn: '+372 5555 1234' },
      { id: 'footer_contact_line_3', sectionGroup: 'homepage_meta', sortOrder: 120, label: 'Kontaktirida 3', helper: 'Lisainfo', defaultEt: 'Sissepääs hoovi poolt', defaultEn: 'Entrance from courtyard side' },
      { id: 'footer_email', sectionGroup: 'homepage_meta', sortOrder: 130, label: 'E-post', helper: 'Nt: hello@nailify.com', defaultEt: 'hello@nailify.com', defaultEn: 'hello@nailify.com' },
      { id: 'footer_hours_label', sectionGroup: 'homepage_meta', sortOrder: 140, label: 'Aja märksõna', helper: 'Nt: Avatud', defaultEt: 'Avatud', defaultEn: 'Open' },
      { id: 'footer_hours_value', sectionGroup: 'homepage_meta', sortOrder: 150, label: 'Lahtioleku aeg', helper: 'Nt: E-R 09:00-20:00', defaultEt: 'E-R 09:00-20:00', defaultEn: 'Mon-Fri 09:00-20:00' },
    ],
  },
];

const ALL_FIELDS = FIELD_GROUPS.flatMap((group) => group.fields);

export default function AdminHomepageContentPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, DraftEntry>>({});
  const [baseline, setBaseline] = useState<Record<string, DraftEntry>>({});
  const [activeLanguage, setActiveLanguage] = useState<'et' | 'en'>('et');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/homepage-sections?admin=1', { cache: 'no-store' });
      if (!response.ok) throw new Error('Avalehe sisu laadimine ebaõnnestus');

      const data = (await response.json()) as { sections?: SectionRow[] };
      const rowMap = new Map<string, SectionRow>();
      for (const row of data.sections ?? []) rowMap.set(row.id, row);

      const next: Record<string, DraftEntry> = {};
      for (const field of ALL_FIELDS) {
        const row = rowMap.get(field.id);
        next[field.id] = {
          valueEt: row?.valueEt ?? field.defaultEt,
          valueEn: row?.valueEn ?? field.defaultEn,
        };
      }

      setDraft(next);
      setBaseline(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Avalehe sisu laadimine ebaõnnestus');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const changedCount = useMemo(() => {
    return ALL_FIELDS.reduce((count, field) => {
      const current = draft[field.id];
      const initial = baseline[field.id];
      if (!current || !initial) return count;
      const changed = current.valueEt !== initial.valueEt || current.valueEn !== initial.valueEn;
      return changed ? count + 1 : count;
    }, 0);
  }, [draft, baseline]);

  const updateField = (id: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [id]: {
        valueEt: activeLanguage === 'et' ? value : prev[id]?.valueEt ?? '',
        valueEn: activeLanguage === 'en' ? value : prev[id]?.valueEn ?? '',
      },
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const entries = ALL_FIELDS.map((field) => ({
        id: field.id,
        sectionGroup: field.sectionGroup,
        sortOrder: field.sortOrder,
        isActive: true,
        valueEt: draft[field.id]?.valueEt ?? '',
        valueEn: draft[field.id]?.valueEn ?? '',
      }));

      const response = await fetch('/api/homepage-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });

      if (!response.ok) throw new Error('Avalehe sisu salvestamine ebaõnnestus');

      setSuccess('Salvestatud.');
      setBaseline(draft);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Avalehe sisu salvestamine ebaõnnestus');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <AdminPageHeader
          overline="Avaleht"
          title="Avalehe kontakt ja usaldustekstid"
          subtitle="Lihtne vaade: vali keel, muuda tekstid ja salvesta."
          backHref="/admin"
          backLabel="Halduspaneel"
        />

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        <section className="mb-5 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-1">
              <button
                type="button"
                onClick={() => setActiveLanguage('et')}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${activeLanguage === 'et' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                Eesti
              </button>
              <button
                type="button"
                onClick={() => setActiveLanguage('en')}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${activeLanguage === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                English
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-slate-600">
                Muudetud: <strong>{changedCount}</strong>
              </span>
              <button
                type="button"
                onClick={() => void loadData()}
                className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Värskenda
              </button>
              <button
                type="button"
                onClick={() => void saveAll()}
                disabled={saving || changedCount === 0}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Salvestan...' : 'Salvesta'}
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 text-sm text-slate-500 shadow-sm">Laen andmeid...</section>
        ) : (
          <div className="space-y-5">
            {FIELD_GROUPS.map((group) => (
              <section key={group.id} className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">{group.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{group.description}</p>

                <div className="mt-4 space-y-3">
                  {group.fields.map((field) => (
                    <label key={field.id} className="block rounded-xl border border-[#edf0f3] bg-[#fbfcfd] p-3">
                      <span className="text-sm font-semibold text-slate-900">{field.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{field.helper}</span>
                      <input
                        value={activeLanguage === 'et' ? draft[field.id]?.valueEt ?? '' : draft[field.id]?.valueEn ?? ''}
                        onChange={(event) => updateField(field.id, event.target.value)}
                        className="mt-2 w-full rounded-xl border border-[#d9dfe6] bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

