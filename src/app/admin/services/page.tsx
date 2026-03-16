'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Service } from '@/store/booking-types';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';

interface AdminService extends Service {
  nameEt?: string;
  nameEn?: string;
  descriptionEt?: string;
  descriptionEn?: string;
  resultDescriptionEt?: string;
  resultDescriptionEn?: string;
  longevityDescriptionEt?: string;
  longevityDescriptionEn?: string;
  suitabilityNoteEt?: string;
  suitabilityNoteEn?: string;
  imageUrl?: string | null;
  active?: boolean;
}

interface ServiceDraft {
  id: string;
  nameEt: string;
  nameEn: string;
  descriptionEt: string;
  descriptionEn: string;
  resultDescriptionEt: string;
  resultDescriptionEn: string;
  longevityDescriptionEt: string;
  longevityDescriptionEn: string;
  suitabilityNoteEt: string;
  suitabilityNoteEn: string;
  duration: number;
  price: number;
  category: Service['category'];
  imageUrl: string;
  isPopular: boolean;
  active: boolean;
}

const emptyDraft: ServiceDraft = {
  id: '',
  nameEt: '',
  nameEn: '',
  descriptionEt: '',
  descriptionEn: '',
  resultDescriptionEt: '',
  resultDescriptionEn: '',
  longevityDescriptionEt: '',
  longevityDescriptionEn: '',
  suitabilityNoteEt: '',
  suitabilityNoteEn: '',
  duration: 45,
  price: 35,
  category: 'manicure',
  imageUrl: '',
  isPopular: false,
  active: true,
};

function toDraft(service: AdminService): ServiceDraft {
  return {
    id: service.id,
    nameEt: service.nameEt ?? service.name ?? '',
    nameEn: service.nameEn ?? '',
    descriptionEt: service.descriptionEt ?? service.description ?? '',
    descriptionEn: service.descriptionEn ?? '',
    resultDescriptionEt: service.resultDescriptionEt ?? service.resultDescription ?? '',
    resultDescriptionEn: service.resultDescriptionEn ?? '',
    longevityDescriptionEt: service.longevityDescriptionEt ?? service.longevityDescription ?? '',
    longevityDescriptionEn: service.longevityDescriptionEn ?? '',
    suitabilityNoteEt: service.suitabilityNoteEt ?? service.suitabilityNote ?? '',
    suitabilityNoteEn: service.suitabilityNoteEn ?? '',
    duration: service.duration,
    price: service.price,
    category: service.category,
    imageUrl: service.imageUrl ?? '',
    isPopular: Boolean(service.isPopular),
    active: service.active !== false,
  };
}

function categoryLabel(category: Service['category']) {
  if (category === 'manicure') return 'Manikuur';
  if (category === 'pedicure') return 'Pedikuur';
  if (category === 'extensions') return 'Pikendused';
  return 'Nail art';
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<AdminService[]>([]);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadServices = async () => {
    const response = await fetch('/api/services?admin=1', { cache: 'no-store' });
    if (!response.ok) throw new Error('Teenuseid ei saanud laadida');
    const data = (await response.json()) as { services?: AdminService[] };
    setServices(data.services ?? []);
  };

  useEffect(() => {
    void loadServices().catch(() => setError('Teenuste laadimine ebaonnestus.'));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const saveService = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id || undefined,
          nameEt: draft.nameEt,
          nameEn: draft.nameEn,
          descriptionEt: draft.descriptionEt,
          descriptionEn: draft.descriptionEn,
          resultDescriptionEt: draft.resultDescriptionEt,
          resultDescriptionEn: draft.resultDescriptionEn,
          longevityDescriptionEt: draft.longevityDescriptionEt,
          longevityDescriptionEn: draft.longevityDescriptionEn,
          suitabilityNoteEt: draft.suitabilityNoteEt,
          suitabilityNoteEn: draft.suitabilityNoteEn,
          duration: draft.duration,
          price: draft.price,
          category: draft.category,
          imageUrl: draft.imageUrl || null,
          isPopular: draft.isPopular,
          active: draft.active,
        }),
      });
      if (!response.ok) {
        throw new Error('Salvestamine ebaonnestus');
      }
      await loadServices();
      setIsDrawerOpen(false);
      setDraft(emptyDraft);
      setToast('Teenuse muudatused salvestatud');
    } catch {
      setError('Teenuse salvestamine ebaonnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteService = async (id: string, serviceName: string) => {
    const isConfirmed = window.confirm(`Kas kustutada teenus "${serviceName}"? Seda tegevust ei saa tagasi votta.`);
    if (!isConfirmed) return;

    try {
      const response = await fetch(`/api/services?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Kustutamine ebaonnestus');
      await loadServices();
      setToast('Teenus kustutatud');
    } catch {
      setError('Teenuse kustutamine ebaonnestus.');
    }
  };

  const generateEnglishSuggestion = async (source: string, field: 'nameEn' | 'descriptionEn') => {
    if (!source.trim()) return;
    const response = await fetch('/api/admin/translate-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: source }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { suggestion?: string };
    if (data.suggestion) {
      setDraft((prev) => ({ ...prev, [field]: prev[field].trim() ? prev[field] : data.suggestion ?? '' }));
    }
  };

  return (
    <main className="admin-cockpit-bg px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="admin-cockpit-shell mb-6 rounded-[28px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6b7280]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#111827]">Teenused</h1>
            </div>
            <div className="flex gap-2 text-sm">
              <button onClick={() => { setDraft(emptyDraft); setIsDrawerOpen(true); }} className="rounded-full bg-[#111827] px-4 py-2 font-semibold text-white">
                Lisa teenus
              </button>
              <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[#4b5563]" href="/admin">Halduspaneel</Link>
              <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[#4b5563]" href="/admin/products">Tooted</Link>
            </div>
          </div>
        </header>

        <AdminQuickActions />

        <section className="admin-surface-soft mb-6 rounded-3xl p-4">
          <h2 className="text-lg font-semibold text-[#111827]">Kuidas teenuseid muuta</h2>
          <div className="mt-2 grid gap-2 text-sm text-[#4b5563] md:grid-cols-3">
            <p className="rounded-xl bg-white px-3 py-2">1. Vajuta &quot;Muuda&quot; soovitud teenuse juures.</p>
            <p className="rounded-xl bg-white px-3 py-2">2. Uuenda nimi, hind, kestus ja kirjeldused.</p>
            <p className="rounded-xl bg-white px-3 py-2">3. Vajuta &quot;Salvesta teenus&quot;.</p>
          </div>
        </section>

        {toast && <div className="fixed right-4 top-6 z-[70] rounded-xl border border-[#edd9e3] bg-white px-4 py-2 text-sm font-medium text-[#6a3b57] shadow-lg">{toast}</div>}
        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="admin-surface overflow-hidden rounded-3xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f9fafb] text-[#5a4652]">
                <tr>
                  <th className="px-4 py-3 font-medium">Teenus</th>
                  <th className="px-4 py-3 font-medium">Hind</th>
                  <th className="px-4 py-3 font-medium">Kestus</th>
                  <th className="px-4 py-3 font-medium">Kategooria</th>
                  <th className="px-4 py-3 font-medium">Nahtavus</th>
                  <th className="px-4 py-3 font-medium">Tegevused</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="border-t border-[#f1e7e1] text-[#3b2f28]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-xl border border-[#efdfeb] bg-[#f8eef5]">
                          {service.imageUrl ? (
                            <Image src={service.imageUrl} alt={service.nameEt ?? service.name} width={96} height={96} unoptimized className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-[#8e7683]">Nailify</div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{service.nameEt ?? service.name}</div>
                          <div className="text-xs text-[#6b7280]">{service.nameEn || service.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">EUR {service.price}</td>
                    <td className="px-4 py-3">{service.duration} min</td>
                    <td className="px-4 py-3">{categoryLabel(service.category)}</td>
                    <td className="px-4 py-3">{service.active === false ? 'Peidetud' : 'Aktiivne'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setDraft(toDraft(service)); setIsDrawerOpen(true); }} className="rounded-full border border-[#d1d5db] px-3 py-1 text-xs text-[#4b5563] hover:bg-[#f9fafb]">Muuda</button>
                        <button onClick={() => void deleteService(service.id, service.nameEt ?? service.name)} className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">Kustuta</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-[#281a25]/45 backdrop-blur-[2px]" onClick={() => setIsDrawerOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-5xl overflow-y-auto border-l border-[#e9dce5] bg-[linear-gradient(180deg,#fff_0%,#fff8fc_100%)] p-5 shadow-[-28px_0_56px_-42px_rgba(38,20,31,0.75)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#6b7280]">Teenuse haldus</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#111827]">{draft.id ? 'Muuda teenust' : 'Lisa teenus'}</h2>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="rounded-full border border-[#d1d5db] bg-white px-3 py-1 text-sm text-[#4b5563]">Sulge</button>
            </div>

            <section className="rounded-2xl border border-[#eee3dc] bg-white/90 p-4">
              <div className="mb-3 grid gap-2 text-xs text-[#7f6670] md:grid-cols-2">
                <p>Eesti tekst kuvatakse /et lehel.</p>
                <p>Inglise tekst kuvatakse /en lehel.</p>
              </div>
              <div className="mb-3 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.14em] text-[#7f6670]">Eesti keel</p>
                  <label className="block text-sm font-medium text-[#4f3f46]">Teenuse nimi
                    <input value={draft.nameEt} onChange={(e) => setDraft((p) => ({ ...p, nameEt: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                  </label>
                  <label className="mt-3 block text-sm font-medium text-[#4f3f46]">Kirjeldus
                    <textarea value={draft.descriptionEt} onChange={(e) => setDraft((p) => ({ ...p, descriptionEt: e.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                  </label>
                  <label className="mt-3 block text-sm font-medium text-[#4f3f46]">Tulemuse kirjeldus
                    <textarea value={draft.resultDescriptionEt} onChange={(e) => setDraft((p) => ({ ...p, resultDescriptionEt: e.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                  </label>
                  <label className="mt-3 block text-sm font-medium text-[#4f3f46]">Pusivus
                    <input value={draft.longevityDescriptionEt} onChange={(e) => setDraft((p) => ({ ...p, longevityDescriptionEt: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                  </label>
                  <label className="mt-3 block text-sm font-medium text-[#4f3f46]">Sobivus
                    <input value={draft.suitabilityNoteEt} onChange={(e) => setDraft((p) => ({ ...p, suitabilityNoteEt: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                  </label>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.14em] text-[#7f6670]">English version</p>
                  <label className="block text-sm font-medium text-[#4f3f46]">Service name
                    <div className="mt-1 flex gap-2">
                      <input value={draft.nameEn} onChange={(e) => setDraft((p) => ({ ...p, nameEn: e.target.value }))} className="w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                      <button type="button" onClick={() => void generateEnglishSuggestion(draft.nameEt, 'nameEn')} className="rounded-xl border border-[#e5ddd3] px-2 py-1 text-xs text-[#4b5563]">Generate English suggestion</button>
                    </div>
                  </label>
                  <label className="mt-3 block text-sm font-medium text-[#4f3f46]">Description
                    <textarea value={draft.descriptionEn} onChange={(e) => setDraft((p) => ({ ...p, descriptionEn: e.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                  </label>
                  <label className="mt-3 block text-sm font-medium text-[#4f3f46]">Result description
                    <textarea value={draft.resultDescriptionEn} onChange={(e) => setDraft((p) => ({ ...p, resultDescriptionEn: e.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                  </label>
                  <label className="mt-3 block text-sm font-medium text-[#4f3f46]">Longevity
                    <input value={draft.longevityDescriptionEn} onChange={(e) => setDraft((p) => ({ ...p, longevityDescriptionEn: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                  </label>
                  <label className="mt-3 block text-sm font-medium text-[#4f3f46]">Suitability
                    <input value={draft.suitabilityNoteEn} onChange={(e) => setDraft((p) => ({ ...p, suitabilityNoteEn: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                  </label>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <label className="block text-sm font-medium text-[#4f3f46]">Hind (EUR)
                  <input type="number" value={draft.price} onChange={(e) => setDraft((p) => ({ ...p, price: Number(e.target.value) }))} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                </label>
                <label className="block text-sm font-medium text-[#4f3f46]">Kestus (min)
                  <input type="number" value={draft.duration} onChange={(e) => setDraft((p) => ({ ...p, duration: Number(e.target.value) }))} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                </label>
                <label className="block text-sm font-medium text-[#4f3f46]">Kategooria
                  <select value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value as Service['category'] }))} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]">
                    <option value="manicure">Manikuur</option>
                    <option value="pedicure">Pedikuur</option>
                    <option value="extensions">Pikendused</option>
                    <option value="nail-art">Nail art</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-[#4f3f46]">Pildi URL
                  <div className="mt-1 flex gap-2">
                    <input value={draft.imageUrl} onChange={(e) => setDraft((p) => ({ ...p, imageUrl: e.target.value }))} className="w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setDraft((p) => ({ ...p, imageUrl: String(reader.result ?? '') }));
                      reader.readAsDataURL(file);
                    }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-[#e5ddd3] px-3 py-2 text-xs text-[#4b5563]">Upload</button>
                  </div>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-[#5f4f5f]">
                <label className="flex items-center gap-2"><input type="checkbox" checked={draft.isPopular} onChange={(e) => setDraft((p) => ({ ...p, isPopular: e.target.checked }))} /> Esile tostetud avalehel</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft((p) => ({ ...p, active: e.target.checked }))} /> Aktiivne</label>
                <span className="text-xs text-[#8a7486]">Esile tostetud teenus kuvatakse teenuste plokis esimesena.</span>
              </div>
            </section>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button onClick={() => void saveService()} disabled={!draft.nameEt || isSaving} className="rounded-full bg-[#111827] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {isSaving ? 'Salvestan...' : 'Salvesta teenus'}
              </button>
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-sm text-[#4b5563]">Tuhista</button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
