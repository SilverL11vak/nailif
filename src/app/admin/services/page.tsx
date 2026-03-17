'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Service } from '@/store/booking-types';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

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
  sortOrder?: number;
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
  sortOrder: number;
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
  sortOrder: 0,
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
    sortOrder: service.sortOrder ?? 0,
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
          sortOrder: draft.sortOrder,
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
    <main className="admin-cockpit-bg min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AdminPageHeader
          overline="Sisu"
          title="Teenused"
          subtitle="Avalehe plokk „Meie teenused” kasutab neid andmeid. Muuda teenuse juures „Muuda”, lisa uus nuppuga „Lisa teenus”."
          backHref="/admin"
          backLabel="Halduspaneel"
          primaryAction={{ label: 'Lisa teenus', onClick: () => { setDraft(emptyDraft); setIsDrawerOpen(true); } }}
          secondaryLinks={[{ label: 'Tooted', href: '/admin/products' }]}
        />

        {toast && <div className="fixed right-4 top-6 z-[70] rounded-xl border border-[var(--color-border-card-soft)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-primary)] shadow-lg">{toast}</div>}
        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="admin-panel overflow-hidden">
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="admin-muted">Teenuseid pole. Lisa esimene teenus.</p>
              <button type="button" onClick={() => { setDraft(emptyDraft); setIsDrawerOpen(true); }} className="btn-primary btn-primary-md mt-4">
                Lisa teenus
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--color-border-card-soft)] bg-[#fef8fb]/60">
                  <tr>
                    <th className="px-4 py-3 font-semibold admin-heading">Teenus</th>
                    <th className="px-4 py-3 font-semibold admin-heading">Hind</th>
                    <th className="px-4 py-3 font-semibold admin-heading">Kestus</th>
                    <th className="px-4 py-3 font-semibold admin-heading">Kategooria</th>
                    <th className="px-4 py-3 font-semibold admin-heading">Nähtavus</th>
                    <th className="px-4 py-3 font-semibold admin-heading text-right">Tegevused</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id} className="border-b border-[var(--color-border-card-soft)] last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border-card-soft)] bg-[#fef8fb]">
                            {service.imageUrl ? (
                              <Image src={service.imageUrl} alt={service.nameEt ?? service.name} width={96} height={96} unoptimized className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] admin-muted">—</div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium admin-heading">{service.nameEt ?? service.name}</div>
                            <div className="text-xs admin-muted">{service.nameEn || service.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 admin-heading">€{service.price}</td>
                      <td className="px-4 py-3 admin-muted">{service.duration} min</td>
                      <td className="px-4 py-3 admin-muted">{categoryLabel(service.category)}</td>
                      <td className="px-4 py-3">
                        {service.active === false ? (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">Peidetud</span>
                        ) : (
                          <span className="inline-flex rounded-full border border-[var(--color-border-card-soft)] bg-white px-2.5 py-0.5 text-xs font-medium admin-muted">Aktiivne</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setDraft(toDraft(service)); setIsDrawerOpen(true); }} className="btn-secondary btn-secondary-sm">Muuda</button>
                          <button onClick={() => void deleteService(service.id, service.nameEt ?? service.name)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100">Kustuta</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} aria-hidden />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-[var(--color-border-card-soft)] bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-card-soft)] bg-[#fef8fb]/80 px-5 py-4">
              <div>
                <p className="admin-section-overline">Teenuse haldus</p>
                <h2 className="type-h4 admin-heading mt-1">{draft.id ? 'Muuda teenust' : 'Lisa teenus'}</h2>
              </div>
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="btn-secondary btn-secondary-sm" aria-label="Sulge">Sulge</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-6">
                <section className="admin-panel p-4">
                  <p className="admin-section-overline mb-3">Põhiandmed</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="type-small admin-heading block mb-1">Hind (EUR)</span>
                      <input type="number" value={draft.price} onChange={(e) => setDraft((p) => ({ ...p, price: Number(e.target.value) }))} className="input-premium" />
                    </label>
                    <label className="block">
                      <span className="type-small admin-heading block mb-1">Kestus (min)</span>
                      <input type="number" value={draft.duration} onChange={(e) => setDraft((p) => ({ ...p, duration: Number(e.target.value) }))} className="input-premium" />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="type-small admin-heading block mb-1">Kategooria</span>
                      <select value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value as Service['category'] }))} className="input-premium">
                        <option value="manicure">Manikuur</option>
                        <option value="pedicure">Pedikuur</option>
                        <option value="extensions">Pikendused</option>
                        <option value="nail-art">Nail art</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section className="admin-panel p-4">
                  <p className="admin-section-overline mb-3">Nimetus ja kirjeldused (Eesti / English)</p>
                  <p className="type-small admin-muted mb-3">Eesti kuvatakse /et, inglise keel /en lehel.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-3">
                      <label className="block">
                        <span className="type-small admin-heading block mb-1">Teenuse nimi (ET)</span>
                        <input value={draft.nameEt} onChange={(e) => setDraft((p) => ({ ...p, nameEt: e.target.value }))} className="input-premium" placeholder="Näiteks Geelimaniküür" />
                      </label>
                      <label className="block">
                        <span className="type-small admin-heading block mb-1">Kirjeldus (ET)</span>
                        <textarea value={draft.descriptionEt} onChange={(e) => setDraft((p) => ({ ...p, descriptionEt: e.target.value }))} className="input-premium min-h-[100px]" rows={3} />
                      </label>
                      <label className="block">
                        <span className="type-small admin-muted block mb-1">Tulemus, püsivus, sobivus (ET)</span>
                        <input value={draft.resultDescriptionEt} onChange={(e) => setDraft((p) => ({ ...p, resultDescriptionEt: e.target.value }))} className="input-premium" placeholder="Tulemuse kirjeldus" />
                        <input value={draft.longevityDescriptionEt} onChange={(e) => setDraft((p) => ({ ...p, longevityDescriptionEt: e.target.value }))} className="input-premium mt-2" placeholder="Püsivus" />
                        <input value={draft.suitabilityNoteEt} onChange={(e) => setDraft((p) => ({ ...p, suitabilityNoteEt: e.target.value }))} className="input-premium mt-2" placeholder="Sobivus" />
                      </label>
                    </div>
                    <div className="space-y-3">
                      <label className="block">
                        <span className="type-small admin-heading block mb-1">Service name (EN)</span>
                        <div className="flex gap-2">
                          <input value={draft.nameEn} onChange={(e) => setDraft((p) => ({ ...p, nameEn: e.target.value }))} className="input-premium flex-1" placeholder="e.g. Gel manicure" />
                          <button type="button" onClick={() => void generateEnglishSuggestion(draft.nameEt, 'nameEn')} className="btn-secondary btn-secondary-sm shrink-0 text-xs">EN</button>
                        </div>
                      </label>
                      <label className="block">
                        <span className="type-small admin-heading block mb-1">Description (EN)</span>
                        <textarea value={draft.descriptionEn} onChange={(e) => setDraft((p) => ({ ...p, descriptionEn: e.target.value }))} className="input-premium min-h-[100px]" rows={3} />
                      </label>
                      <label className="block">
                        <span className="type-small admin-muted block mb-1">Result, longevity, suitability (EN)</span>
                        <input value={draft.resultDescriptionEn} onChange={(e) => setDraft((p) => ({ ...p, resultDescriptionEn: e.target.value }))} className="input-premium" placeholder="Result description" />
                        <input value={draft.longevityDescriptionEn} onChange={(e) => setDraft((p) => ({ ...p, longevityDescriptionEn: e.target.value }))} className="input-premium mt-2" placeholder="Longevity" />
                        <input value={draft.suitabilityNoteEn} onChange={(e) => setDraft((p) => ({ ...p, suitabilityNoteEn: e.target.value }))} className="input-premium mt-2" placeholder="Suitability" />
                      </label>
                    </div>
                  </div>
                </section>

                <section className="admin-panel p-4">
                  <p className="admin-section-overline mb-3">Pilt ja nähtavus</p>
                  <label className="block mb-3">
                    <span className="type-small admin-heading block mb-1">Pildi URL või lae fail</span>
                    <div className="flex gap-2">
                      <input value={draft.imageUrl} onChange={(e) => setDraft((p) => ({ ...p, imageUrl: e.target.value }))} className="input-premium flex-1" placeholder="URL või base64" />
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setDraft((p) => ({ ...p, imageUrl: String(reader.result ?? '') }));
                        reader.readAsDataURL(file);
                      }} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary btn-secondary-sm">Lae üles</button>
                    </div>
                  </label>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 type-small admin-heading">
                      <input type="checkbox" checked={draft.isPopular} onChange={(e) => setDraft((p) => ({ ...p, isPopular: e.target.checked }))} />
                      Esiletõstetud avalehel
                    </label>
                    <label className="flex items-center gap-2 type-small admin-heading">
                      <input type="checkbox" checked={draft.active} onChange={(e) => setDraft((p) => ({ ...p, active: e.target.checked }))} />
                      Aktiivne (nähtav broneerimisel)
                    </label>
                  </div>
                  <label className="mt-3 block">
                    <span className="type-small admin-muted block mb-1">Järjekord (väiksem = eespool)</span>
                    <input type="number" value={draft.sortOrder} onChange={(e) => setDraft((p) => ({ ...p, sortOrder: Number(e.target.value) }))} className="input-premium w-24" />
                  </label>
                </section>
              </div>
            </div>
            <div className="shrink-0 border-t border-[var(--color-border-card-soft)] bg-[#fef8fb]/60 px-5 py-4 flex flex-wrap items-center gap-3">
              <button onClick={() => void saveService()} disabled={!draft.nameEt || isSaving} className="btn-primary btn-primary-md disabled:opacity-50">
                {isSaving ? 'Salvestan...' : 'Salvesta teenus'}
              </button>
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="btn-secondary btn-secondary-md">Tühista</button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
