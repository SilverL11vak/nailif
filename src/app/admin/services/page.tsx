'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { Service } from '@/store/booking-types';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';

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

  const sortedServices = [...services].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const updateOrder = async (service: AdminService, direction: 'up' | 'down') => {
    const idx = sortedServices.findIndex((s) => s.id === service.id);
    if (idx < 0) return;
    const otherIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (otherIdx < 0 || otherIdx >= sortedServices.length) return;
    const other = sortedServices[otherIdx];
    const currentOrder = service.sortOrder ?? 0;
    const otherOrder = other.sortOrder ?? 0;
    setError(null);
    try {
      const payloadA = { ...toDraft(service), sortOrder: otherOrder };
      const payloadB = { ...toDraft(other), sortOrder: currentOrder };
      await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payloadA.id || undefined,
          nameEt: payloadA.nameEt,
          nameEn: payloadA.nameEn,
          descriptionEt: payloadA.descriptionEt,
          descriptionEn: payloadA.descriptionEn,
          resultDescriptionEt: payloadA.resultDescriptionEt,
          resultDescriptionEn: payloadA.resultDescriptionEn,
          longevityDescriptionEt: payloadA.longevityDescriptionEt,
          longevityDescriptionEn: payloadA.longevityDescriptionEn,
          suitabilityNoteEt: payloadA.suitabilityNoteEt,
          suitabilityNoteEn: payloadA.suitabilityNoteEn,
          duration: payloadA.duration,
          price: payloadA.price,
          category: payloadA.category,
          imageUrl: payloadA.imageUrl || null,
          isPopular: payloadA.isPopular,
          sortOrder: payloadA.sortOrder,
          active: payloadA.active,
        }),
      });
      await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payloadB.id || undefined,
          nameEt: payloadB.nameEt,
          nameEn: payloadB.nameEn,
          descriptionEt: payloadB.descriptionEt,
          descriptionEn: payloadB.descriptionEn,
          resultDescriptionEt: payloadB.resultDescriptionEt,
          resultDescriptionEn: payloadB.resultDescriptionEn,
          longevityDescriptionEt: payloadB.longevityDescriptionEt,
          longevityDescriptionEn: payloadB.longevityDescriptionEn,
          suitabilityNoteEt: payloadB.suitabilityNoteEt,
          suitabilityNoteEn: payloadB.suitabilityNoteEn,
          duration: payloadB.duration,
          price: payloadB.price,
          category: payloadB.category,
          imageUrl: payloadB.imageUrl || null,
          isPopular: payloadB.isPopular,
          sortOrder: payloadB.sortOrder,
          active: payloadB.active,
        }),
      });
      await loadServices();
      setToast('Järjekord uuendatud');
    } catch {
      setError('Järjekord ei uuendatud.');
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AdminPageHeader
          overline="Sisu"
          title="Teenused"
          subtitle="Avalehe plokk „Meie teenused” kasutab neid andmeid. Muuda teenuse juures „Muuda”, lisa uus nuppuga „Lisa teenus”."
          backHref="/admin"
          backLabel="Halduspaneel"
          primaryAction={{ label: 'Lisa teenus', onClick: () => { setDraft(emptyDraft); setIsDrawerOpen(true); } }}
          secondaryLinks={[{ label: 'Tooted', href: '/admin/products' }]}
        />

        {toast && <div className="fixed right-6 top-6 z-[70] rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-lg">{toast}</div>}
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-800">{error}</div>}

        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-slate-500">Teenuseid pole. Lisa esimene teenus.</p>
              <button type="button" onClick={() => { setDraft(emptyDraft); setIsDrawerOpen(true); }} className="mt-5 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-900">
                Lisa teenus
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedServices.map((service, index) => (
                <article
                  key={service.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { setDraft(toDraft(service)); setIsDrawerOpen(true); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDraft(toDraft(service)); setIsDrawerOpen(true); } }}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200 cursor-pointer"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                    {service.imageUrl ? (
                      <Image
                        src={service.imageUrl}
                        alt={service.nameEt ?? service.name}
                        width={400}
                        height={300}
                        unoptimized
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <span className="text-4xl font-light text-slate-300">—</span>
                      </div>
                    )}
                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-1 shadow-sm">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateOrder(service, 'up'); }}
                        disabled={index === 0}
                        className="rounded p-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        aria-label="Tõsta üles"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateOrder(service, 'down'); }}
                        disabled={index === sortedServices.length - 1}
                        className="rounded p-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        aria-label="Tõsta alla"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-slate-800">{service.nameEt ?? service.name}</h3>
                      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {categoryLabel(service.category)}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-800">€{service.price}</p>
                    <p className="text-sm text-slate-500">{service.duration} min</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className={service.active === false ? 'rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800' : 'rounded-full border border-[#e5e7eb] bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600'}>
                        {service.active === false ? 'Peidetud' : 'Aktiivne'}
                      </span>
                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDraft(toDraft(service)); setIsDrawerOpen(true); }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Muuda
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void deleteService(service.id, service.nameEt ?? service.name); }}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Kustuta
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} aria-hidden />
          <div className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col bg-white shadow-xl lg:flex-row">
            <div className="flex shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-5 py-4 lg:border-b-0 lg:border-r lg:px-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Teenuse haldus</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-800">{draft.id ? 'Muuda teenust' : 'Lisa teenus'}</h2>
              </div>
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50" aria-label="Sulge">Sulge</button>
            </div>
            <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
              {/* Left: Main editor card */}
              <div className="flex-1 overflow-y-auto p-5 lg:p-6">
                <div className="space-y-6">
                  {/* 1. Basic Info */}
                  <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-4">Põhiandmed</p>
                    <div className="space-y-4">
                      <label className="block">
                        <span className="block text-sm font-medium text-slate-700 mb-1">Teenuse nimi (ET)</span>
                        <input value={draft.nameEt} onChange={(e) => setDraft((p) => ({ ...p, nameEt: e.target.value }))} className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" placeholder="Näiteks Geelimaniküür" />
                      </label>
                      <label className="block">
                        <span className="block text-sm font-medium text-slate-700 mb-1">Kategooria</span>
                        <select value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value as Service['category'] }))} className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200">
                          <option value="manicure">Manikuur</option>
                          <option value="pedicure">Pedikuur</option>
                          <option value="extensions">Pikendused</option>
                          <option value="nail-art">Nail art</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-3">
                        <input type="checkbox" checked={draft.active} onChange={(e) => setDraft((p) => ({ ...p, active: e.target.checked }))} className="h-4 w-4 rounded border-[#e5e7eb] text-slate-700" />
                        <span className="text-sm font-medium text-slate-700">Aktiivne (nähtav broneerimisel)</span>
                      </label>
                    </div>
                  </section>

                  {/* 2. Pricing & Duration */}
                  <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-4">Hind ja kestus</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="block text-sm font-medium text-slate-700 mb-1">Hind (EUR)</span>
                        <input type="number" value={draft.price} onChange={(e) => setDraft((p) => ({ ...p, price: Number(e.target.value) }))} className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" />
                      </label>
                      <label className="block">
                        <span className="block text-sm font-medium text-slate-700 mb-1">Kestus (min)</span>
                        <input type="number" value={draft.duration} onChange={(e) => setDraft((p) => ({ ...p, duration: Number(e.target.value) }))} className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" />
                      </label>
                    </div>
                  </section>

                  {/* 3. Descriptions */}
                  <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-4">Kirjeldused (ET / EN)</p>
                    <div className="space-y-4">
                      <label className="block">
                        <span className="block text-sm font-medium text-slate-700 mb-1">Kirjeldus (ET)</span>
                        <textarea value={draft.descriptionEt} onChange={(e) => setDraft((p) => ({ ...p, descriptionEt: e.target.value }))} className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-800 min-h-[88px] focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" rows={3} />
                      </label>
                      <label className="block">
                        <span className="block text-sm text-slate-500 mb-1">Tulemus (ET)</span>
                        <input value={draft.resultDescriptionEt} onChange={(e) => setDraft((p) => ({ ...p, resultDescriptionEt: e.target.value }))} className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" placeholder="Tulemuse kirjeldus" />
                      </label>
                      <label className="block">
                        <span className="block text-sm text-slate-500 mb-1">Püsivus (ET)</span>
                        <input value={draft.longevityDescriptionEt} onChange={(e) => setDraft((p) => ({ ...p, longevityDescriptionEt: e.target.value }))} className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" placeholder="Püsivus" />
                      </label>
                      <label className="block">
                        <span className="block text-sm text-slate-500 mb-1">Sobivus (ET)</span>
                        <input value={draft.suitabilityNoteEt} onChange={(e) => setDraft((p) => ({ ...p, suitabilityNoteEt: e.target.value }))} className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" placeholder="Sobivus" />
                      </label>
                      <div className="border-t border-[#e5e7eb] pt-4">
                        <label className="block">
                          <span className="block text-sm font-medium text-slate-700 mb-1">Service name (EN)</span>
                          <div className="flex gap-2">
                            <input value={draft.nameEn} onChange={(e) => setDraft((p) => ({ ...p, nameEn: e.target.value }))} className="flex-1 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" placeholder="e.g. Gel manicure" />
                            <button type="button" onClick={() => void generateEnglishSuggestion(draft.nameEt, 'nameEn')} className="shrink-0 rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">EN</button>
                          </div>
                        </label>
                        <label className="block mt-3">
                          <span className="block text-sm font-medium text-slate-700 mb-1">Description (EN)</span>
                          <textarea value={draft.descriptionEn} onChange={(e) => setDraft((p) => ({ ...p, descriptionEn: e.target.value }))} className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 min-h-[72px] focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" rows={2} />
                        </label>
                        <label className="block mt-2">
                          <span className="block text-xs text-slate-500 mb-1">Result, longevity, suitability (EN)</span>
                          <input value={draft.resultDescriptionEn} onChange={(e) => setDraft((p) => ({ ...p, resultDescriptionEn: e.target.value }))} className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" placeholder="Result" />
                          <input value={draft.longevityDescriptionEn} onChange={(e) => setDraft((p) => ({ ...p, longevityDescriptionEn: e.target.value }))} className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 mt-1.5 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" placeholder="Longevity" />
                          <input value={draft.suitabilityNoteEn} onChange={(e) => setDraft((p) => ({ ...p, suitabilityNoteEn: e.target.value }))} className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 mt-1.5 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" placeholder="Suitability" />
                        </label>
                      </div>
                    </div>
                  </section>

                  {/* 4. Image Upload Block */}
                  <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-4">Pilt</p>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setDraft((p) => ({ ...p, imageUrl: String(reader.result ?? '') }));
                      reader.readAsDataURL(file);
                    }} />
                    <div className="space-y-4">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border-2 border-dashed border-[#e5e7eb] bg-slate-50">
                        {draft.imageUrl ? (
                          <>
                            <Image src={draft.imageUrl} alt="" fill unoptimized className="object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-900/0 opacity-0 transition hover:opacity-100 hover:bg-slate-900/30">
                              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                Asenda
                              </button>
                              <button type="button" onClick={() => setDraft((p) => ({ ...p, imageUrl: '' }))} className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                                Eemalda
                              </button>
                            </div>
                          </>
                        ) : (
                          <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 text-slate-500 hover:bg-slate-100/80 hover:text-slate-700" onClick={() => fileInputRef.current?.click()}>
                            <span className="text-sm font-medium">Lohista pilt siia või klõpsa</span>
                            <span className="text-xs">või sisesta URL all</span>
                          </label>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input value={draft.imageUrl} onChange={(e) => setDraft((p) => ({ ...p, imageUrl: e.target.value }))} className="flex-1 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" placeholder="Pildi URL" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="shrink-0 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Lae üles</button>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Right: Context panel */}
              <aside className="w-full shrink-0 border-t border-[#e5e7eb] bg-slate-50/50 p-5 lg:w-[320px] lg:border-t-0 lg:border-l lg:p-6">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">Nähtavus</p>
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-700">Aktiivne</span>
                      <input type="checkbox" checked={draft.active} onChange={(e) => setDraft((p) => ({ ...p, active: e.target.checked }))} className="h-4 w-4 rounded border-[#e5e7eb] text-slate-700" />
                    </label>
                    <label className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-700">Esiletõstetud avalehel</span>
                      <input type="checkbox" checked={draft.isPopular} onChange={(e) => setDraft((p) => ({ ...p, isPopular: e.target.checked }))} className="h-4 w-4 rounded border-[#e5e7eb] text-slate-700" />
                    </label>
                  </div>
                  <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                    <label className="block">
                      <span className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Järjekord</span>
                      <input type="number" value={draft.sortOrder} onChange={(e) => setDraft((p) => ({ ...p, sortOrder: Number(e.target.value) }))} className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200" />
                    </label>
                    <p className="mt-1.5 text-[11px] text-slate-500">Väiksem number = eespool nimekirjas</p>
                  </div>
                  <button onClick={() => void saveService()} disabled={!draft.nameEt?.trim() || isSaving} className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50">
                    {isSaving ? 'Salvestan...' : 'Salvesta muudatused'}
                  </button>
                  <button type="button" onClick={() => setIsDrawerOpen(false)} className="w-full rounded-xl border border-[#e5e7eb] bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    Tühista
                  </button>
                  {draft.id && (
                    <button type="button" onClick={() => draft.id && void deleteService(draft.id, draft.nameEt || 'Teenus').then(() => { setIsDrawerOpen(false); setDraft(emptyDraft); }).catch(() => {})} className="w-full rounded-xl border border-red-200 bg-white py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                      Kustuta teenus
                    </button>
                  )}
                  <div className="rounded-xl border border-[#e5e7eb] bg-slate-50/80 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Broneerimine</p>
                    <p className="mt-1 text-xs text-slate-600">Aktiivsed teenused on valitavad broneerimise lehel. Järjekord määrab kuvamise.</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
