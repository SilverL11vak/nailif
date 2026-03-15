'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Service } from '@/store/booking-types';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';

interface AdminService extends Service {
  imageUrl?: string | null;
  active?: boolean;
}

interface ServiceDraft extends AdminService {
  images: string[];
}

function categoryLabel(category: Service['category']) {
  if (category === 'manicure') return 'Maniküür';
  if (category === 'pedicure') return 'Pediküür';
  if (category === 'extensions') return 'Pikendused';
  return 'Nail art';
}

const emptyService: ServiceDraft = {
  id: '',
  name: '',
  description: '',
  duration: 45,
  price: 35,
  category: 'manicure',
  imageUrl: '',
  images: [],
  isPopular: false,
  active: true,
};

const toDraft = (service: AdminService): ServiceDraft => ({
  ...service,
  imageUrl: service.imageUrl ?? '',
  images: service.imageUrl ? [service.imageUrl] : [],
  active: service.active !== false,
});

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function AdminServicesPage() {
  const [services, setServices] = useState<AdminService[]>([]);
  const [draft, setDraft] = useState<ServiceDraft>(emptyService);
  const [isSaving, setIsSaving] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightedServiceId, setHighlightedServiceId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadServices = async () => {
    const response = await fetch('/api/services?admin=1', { cache: 'no-store' });
    if (!response.ok) throw new Error('Teenuseid ei saanud laadida');
    const data = (await response.json()) as { services?: AdminService[] };
    setServices(data.services ?? []);
  };

  useEffect(() => {
    void loadServices().catch(() => setError('Teenuste laadimine ebaõnnestus.'));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timeout);
  }, [toast]);

  const openCreate = () => {
    setDraft(emptyService);
    setError(null);
    setIsDrawerOpen(true);
  };

  const openEdit = (service: AdminService) => {
    setDraft(toDraft(service));
    setError(null);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setError(null);
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= draft.images.length || from === to) return;
    setDraft((prev) => {
      const images = [...prev.images];
      const [item] = images.splice(from, 1);
      images.splice(to, 0, item);
      return { ...prev, images, imageUrl: images[0] ?? '' };
    });
  };

  const markFeatured = (image: string) => {
    setDraft((prev) => {
      const rest = prev.images.filter((entry) => entry !== image);
      return { ...prev, images: [image, ...rest], imageUrl: image };
    });
  };

  const removeImage = (index: number) => {
    setDraft((prev) => {
      const images = prev.images.filter((_, imageIndex) => imageIndex !== index);
      return { ...prev, images, imageUrl: images[0] ?? '' };
    });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(Array.from(files).map((file) => fileToDataUrl(file)));
      setDraft((prev) => {
        const images = [...prev.images, ...uploaded];
        return { ...prev, images, imageUrl: prev.imageUrl || images[0] || '' };
      });
      setToast('Teenuse pilt lisatud');
    } catch {
      setError('Pildi üleslaadimine ebaõnnestus.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          imageUrl: draft.images[0] ?? draft.imageUrl ?? null,
        }),
      });
      if (!response.ok) {
        throw new Error('Salvestamine ebaõnnestus');
      }
      const data = (await response.json()) as { id?: string };
      const savedId = data.id ?? draft.id;
      await loadServices();
      setToast('Teenuse muudatused salvestatud');
      setIsDrawerOpen(false);
      setDraft(emptyService);
      if (savedId) {
        setHighlightedServiceId(savedId);
        setTimeout(() => setHighlightedServiceId(null), 2000);
      }
    } catch {
      setError('Teenuse salvestamine ebaõnnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/services?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Kustutamine ebaõnnestus');
      await loadServices();
      setToast('Teenus kustutatud');
    } catch {
      setError('Teenuse kustutamine ebaõnnestus.');
    }
  };

  return (
    <main className="admin-shell min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff4fa_40%,_#f7ecf4_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="admin-header mb-6 rounded-3xl border border-[#e8e2dc] bg-white/90 p-6 shadow-[0_28px_42px_-34px_rgba(57,45,39,0.42)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#b983a2]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#2f2230]">Teenused</h1>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <button onClick={openCreate} className="rounded-full bg-[#8a5e76] px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-[#754d64]">
                Lisa teenus
              </button>
              <Link className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-[#6f5d53]" href="/admin">
                Halduspaneel
              </Link>
              <Link className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-[#6f5d53]" href="/admin/account">
                Konto
              </Link>
              <Link className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-[#6f5d53]" href="/admin/products">
                Tooted
              </Link>
            </div>
          </div>
        </header>

        <AdminQuickActions />

        {toast && (
          <div className="fixed right-4 top-6 z-[70] rounded-xl border border-[#edd9e3] bg-white px-4 py-2 text-sm font-medium text-[#6a3b57] shadow-lg">
            {toast}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="admin-surface overflow-hidden rounded-3xl border border-[#ece3db] bg-white/95 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.35)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fff5fa] text-[#5a4652]">
                <tr>
                  <th className="px-4 py-3 font-medium">Teenus</th>
                  <th className="px-4 py-3 font-medium">Hind</th>
                  <th className="px-4 py-3 font-medium">Kestus</th>
                  <th className="px-4 py-3 font-medium">Kategooria</th>
                  <th className="px-4 py-3 font-medium">Populaarne</th>
                  <th className="px-4 py-3 font-medium">Nähtavus</th>
                  <th className="px-4 py-3 font-medium">Tegevused</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr
                    key={service.id}
                    className={`border-t border-[#f1e7e1] text-[#3b2f28] transition ${
                      highlightedServiceId === service.id ? 'bg-[#fff8fd]' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-xl border border-[#efdfeb] bg-[#f8eef5]">
                          {service.imageUrl ? (
                            <Image
                              src={service.imageUrl}
                              alt={service.name}
                              width={96}
                              height={96}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-[#8e7683]">Nailify</div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-xs text-[#8a7367]">{service.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">€{service.price}</td>
                    <td className="px-4 py-3">{service.duration} min</td>
                    <td className="px-4 py-3">{categoryLabel(service.category)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          service.isPopular ? 'bg-[#fde8f3] text-[#8a3f64]' : 'bg-[#f5f3f1] text-[#7f6f67]'
                        }`}
                      >
                        {service.isPopular ? 'Populaarne' : 'Tavaline'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          service.active === false ? 'bg-[#ececec] text-[#676767]' : 'bg-[#e9f7ee] text-[#2f6a45]'
                        }`}
                      >
                        {service.active === false ? 'Peidetud' : 'Aktiivne'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(service)}
                          className="rounded-full border border-[#ead8e2] px-3 py-1 text-xs text-[#6f5d53] hover:bg-[#fff7fc]"
                        >
                          Muuda
                        </button>
                        <button
                          onClick={() => void handleDelete(service.id)}
                          className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Kustuta
                        </button>
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
          <div className="absolute inset-0 bg-[#281a25]/45 backdrop-blur-[2px]" onClick={closeDrawer} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-4xl overflow-y-auto border-l border-[#e9dce5] bg-[linear-gradient(180deg,#fff_0%,#fff8fc_100%)] p-5 shadow-[-28px_0_56px_-42px_rgba(38,20,31,0.75)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#b983a2]">Teenuse haldus</p>
                <h2 className="mt-1 text-2xl font-semibold text-[#2f2230]">{draft.id ? 'Muuda teenust' : 'Lisa teenus'}</h2>
              </div>
              <button onClick={closeDrawer} className="rounded-full border border-[#ead8e2] bg-white px-3 py-1 text-sm text-[#6f5d53]">
                Sulge
              </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#eee3dc] bg-white/90 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7f6670]">Teenuse andmed</h3>
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium text-[#4f3f46]">
                    Teenuse nimi
                    <input
                      value={draft.name}
                      onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#8a5e76]"
                    />
                  </label>
                  <label className="block text-sm font-medium text-[#4f3f46]">
                    Hind (€)
                    <input
                      type="number"
                      value={draft.price}
                      onChange={(event) => setDraft((prev) => ({ ...prev, price: Number(event.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#8a5e76]"
                    />
                  </label>
                  <label className="block text-sm font-medium text-[#4f3f46]">
                    Kestus (min)
                    <input
                      type="number"
                      value={draft.duration}
                      onChange={(event) => setDraft((prev) => ({ ...prev, duration: Number(event.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#8a5e76]"
                    />
                  </label>
                  <label className="block text-sm font-medium text-[#4f3f46]">
                    Kategooria
                    <select
                      value={draft.category}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, category: event.target.value as Service['category'] }))
                      }
                      className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#8a5e76]"
                    >
                      <option value="manicure">Maniküür</option>
                      <option value="pedicure">Pediküür</option>
                      <option value="extensions">Pikendused</option>
                      <option value="nail-art">Nail art</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-[#eee3dc] bg-white/90 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7f6670]">Teenuse pilt ja kirjeldus</h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => void handleUpload(event.target.files)}
                  className="hidden"
                />

                {draft.images.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-[#ead8e2] bg-[#fffafd] px-4 py-8 text-center hover:border-[#c892af]"
                  >
                    <span className="text-sm font-semibold text-[#5f4753]">Lisa teenuse pilt</span>
                    <span className="mt-1 text-xs text-[#8b7782]">Lohista siia või vali pilt arvutist</span>
                  </button>
                ) : (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-full border border-[#ead8e2] bg-white px-3 py-1 text-xs text-[#6f5d53]"
                      >
                        {isUploading ? 'Laen pilte...' : 'Lisa või asenda pilt'}
                      </button>
                      <span className="text-xs text-[#8b7782]">Esimene pilt on esiletoodud</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {draft.images.map((image, index) => (
                        <div
                          key={`${image}-${index}`}
                          draggable
                          onDragStart={() => setDragIndex(index)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (dragIndex === null) return;
                            moveImage(dragIndex, index);
                            setDragIndex(null);
                          }}
                          className="group relative overflow-hidden rounded-xl border border-[#eddde5] bg-white shadow-[0_16px_24px_-22px_rgba(84,51,72,0.65)]"
                        >
                          <div className="relative aspect-[4/3]">
                            <Image
                              src={image}
                              alt={`Teenuse pilt ${index + 1}`}
                              fill
                              unoptimized
                              className="object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-[#20141f]/45 via-transparent to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => markFeatured(image)}
                              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                index === 0 ? 'bg-[#8a5e76] text-white' : 'bg-white/90 text-[#5f4753]'
                              }`}
                            >
                              {index === 0 ? 'Esiletoodud' : 'Märgi esiletooduks'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="h-7 w-7 rounded-full bg-white/90 text-sm font-bold text-[#8f3f64]"
                            >
                              ×
                            </button>
                          </div>
                          <div className="absolute right-2 top-2 flex gap-1">
                            <button
                              type="button"
                              onClick={() => moveImage(index, index - 1)}
                              className="h-7 w-7 rounded-full bg-white/90 text-xs text-[#5f4753]"
                              aria-label="Liiguta vasakule"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              onClick={() => moveImage(index, index + 1)}
                              className="h-7 w-7 rounded-full bg-white/90 text-xs text-[#5f4753]"
                              aria-label="Liiguta paremale"
                            >
                              →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label className="mt-4 block text-sm font-medium text-[#4f3f46]">
                  Kirjeldus
                  <textarea
                    value={draft.description ?? ''}
                    onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                    className="mt-1 min-h-24 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#8a5e76]"
                  />
                </label>
              </section>
            </div>

            <section className="mt-5 rounded-2xl border border-[#eee3dc] bg-white/90 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7f6670]">Live eelvaade</h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-[#6f5d53]">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.isPopular)}
                      onChange={(event) => setDraft((prev) => ({ ...prev, isPopular: event.target.checked }))}
                    />
                    Populaarne
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#6f5d53]">
                    <input
                      type="checkbox"
                      checked={draft.active !== false}
                      onChange={(event) => setDraft((prev) => ({ ...prev, active: event.target.checked }))}
                    />
                    Aktiivne
                  </label>
                </div>
              </div>
              <article className="overflow-hidden rounded-2xl border border-[#ebdeea] bg-white shadow-[0_20px_36px_-26px_rgba(71,45,62,0.52)]">
                <div className="relative aspect-[16/8] bg-[#f8eef5]">
                  {draft.images[0] ? (
                    <Image
                      src={draft.images[0]}
                      alt={draft.name || 'Teenuse pilt'}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#8b7782]">Teenuse pilt</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-lg font-semibold text-[#2f2230]">{draft.name || 'Teenuse nimi'}</h4>
                    {draft.isPopular && <span className="rounded-full bg-[#fde8f3] px-2 py-1 text-xs font-semibold text-[#8a3f64]">Populaarne</span>}
                  </div>
                  <p className="mt-2 text-sm text-[#6f5d6d]">{draft.description || 'Teenuse kirjeldus ilmub siia.'}</p>
                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <span className="rounded-full bg-[#f7edf4] px-2 py-1 text-[#6f4c60]">{categoryLabel(draft.category)}</span>
                    <span className="font-semibold text-[#8a5e76]">€{draft.price}</span>
                    <span className="text-[#6f5d6d]">{draft.duration} min</span>
                  </div>
                </div>
              </article>
            </section>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={handleSave}
                disabled={!draft.name || isSaving}
                className="rounded-full bg-[#8a5e76] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSaving ? 'Salvestan...' : 'Salvesta teenus'}
              </button>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-sm text-[#6f5d53]"
              >
                Tühista
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
