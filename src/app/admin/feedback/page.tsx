'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import type { FeedbackItem } from '@/lib/feedback';

interface FeedbackDraft {
  id: string;
  clientName: string;
  clientAvatarUrl: string;
  rating: number;
  feedbackText: string;
  serviceId: string;
  sourceLabel: string;
  sortOrder: number;
  isVisible: boolean;
}

const emptyDraft: FeedbackDraft = {
  id: '',
  clientName: '',
  clientAvatarUrl: '',
  rating: 5,
  feedbackText: '',
  serviceId: '',
  sourceLabel: '',
  sortOrder: 0,
  isVisible: true,
};

function toDraft(item: FeedbackItem): FeedbackDraft {
  return {
    id: item.id,
    clientName: item.clientName,
    clientAvatarUrl: item.clientAvatarUrl ?? '',
    rating: item.rating,
    feedbackText: item.feedbackText,
    serviceId: item.serviceId ?? '',
    sourceLabel: item.sourceLabel ?? '',
    sortOrder: item.sortOrder,
    isVisible: item.isVisible,
  };
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [draft, setDraft] = useState<FeedbackDraft>(emptyDraft);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarDragOver, setAvatarDragOver] = useState(false);

  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const loadFeedback = async () => {
    const response = await fetch('/api/feedback?admin=1', { cache: 'no-store' });
    if (!response.ok) throw new Error('Tagasisidet ei saanud laadida');
    const data = (await response.json()) as { feedback?: FeedbackItem[] };
    setItems(data.feedback ?? []);
  };

  useEffect(() => {
    void loadFeedback().catch(() => setError('Tagasiside laadimine ebaonnestus.'));
  }, []);

  useEffect(() => {
    if (!editId || items.length === 0) return;
    const item = items.find((i) => i.id === editId);
    if (item) {
      setDraft(toDraft(item));
      setIsDrawerOpen(true);
    }
  }, [editId, items]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const saveFeedback = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id || undefined,
          clientName: draft.clientName,
          clientAvatarUrl: draft.clientAvatarUrl || null,
          rating: draft.rating,
          feedbackText: draft.feedbackText,
          serviceId: draft.serviceId || null,
          sourceLabel: draft.sourceLabel || null,
          sortOrder: draft.sortOrder,
          isVisible: draft.isVisible,
        }),
      });
      if (!response.ok) {
        let message = 'Salvestamine ebaonnestus';
        try {
          const data = (await response.json()) as { error?: string };
          if (data?.error) message = data.error;
        } catch {
          // ignore
        }
        if (response.status === 401) message = 'Pole sisse logitud (401). Palun logi admini uuesti sisse.';
        throw new Error(message);
      }
      await loadFeedback();
      setIsDrawerOpen(false);
      setDraft(emptyDraft);
      setToast('Tagasiside salvestatud');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tagasiside salvestamine ebaonnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const uploadAvatarFile = async (file: File) => {
    setError(null);
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/upload-feedback-avatar', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        let message = 'Pildi üleslaadimine ebaõnnestus';
        try {
          const data = (await response.json()) as { error?: string };
          if (data?.error) message = data.error;
        } catch {
          // ignore
        }
        if (response.status === 401) message = 'Pole sisse logitud (401). Palun logi admini uuesti sisse.';
        throw new Error(message);
      }
      const data = (await response.json()) as { url?: string };
      const url = String(data.url ?? '').trim();
      if (!url) throw new Error('Pildi URL puudub');
      setDraft((prev) => ({ ...prev, clientAvatarUrl: url }));
      setToast('Pilt üles laaditud');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pildi üleslaadimine ebaõnnestus.');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const avatarInitials = useMemo(() => (draft.clientName.trim().slice(0, 2) || 'NA').toUpperCase(), [draft.clientName]);

  const deleteFeedback = async (id: string, name: string) => {
    if (!window.confirm(`Kustutada tagasiside "${name}"?`)) return;
    try {
      const response = await fetch(`/api/feedback?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Kustutamine ebaonnestus');
      await loadFeedback();
      setToast('Tagasiside kustutatud');
    } catch {
      setError('Kustutamine ebaonnestus.');
    }
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isVisible: !current }),
      });
      if (!response.ok) throw new Error('Muutmine ebaonnestus');
      await loadFeedback();
      setToast(current ? 'Peidetud' : 'Nähtav');
    } catch {
      setError('Nähtavuse muutmine ebaonnestus.');
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AdminPageHeader
          overline="Sisu"
          title="Kliendi tagasiside"
          subtitle="Avalehe testimoniaalid ja hinnangud. Järjekord määrab kuvamise. Muuda või peida siit."
          backHref="/admin"
          backLabel="Halduspaneel"
          primaryAction={{
            label: 'Lisa tagasiside',
            onClick: () => { setDraft(emptyDraft); setIsDrawerOpen(true); },
          }}
          secondaryLinks={[
            { href: '/admin/services', label: 'Teenused' },
          ]}
        />

        {toast && (
          <div className="fixed right-6 top-6 z-[70] rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-lg">
            {toast}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-[#e5e7eb] bg-white shadow-sm overflow-hidden">
          <div className="mb-4 flex items-center justify-between px-5 pt-5">
            <h2 className="text-lg font-semibold text-slate-800">Tagasiside nimekiri</h2>
            <p className="text-sm text-slate-500">{items.length} kirjet</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#e5e7eb] bg-slate-50/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-800">Pilt / Nimi</th>
                  <th className="px-5 py-3 font-semibold text-slate-800">Hinnang</th>
                  <th className="px-5 py-3 font-semibold text-slate-800">Tsitaat</th>
                  <th className="px-5 py-3 font-semibold text-slate-800">Järjekord</th>
                  <th className="px-5 py-3 font-semibold text-slate-800">Nähtavus</th>
                  <th className="px-5 py-3 font-semibold text-slate-800 text-right">Tegevused</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                      Tagasisidet pole. Lisa esimene avalehe testimoniaal.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-[#e5e7eb] hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-xl border border-[#e5e7eb] bg-slate-100">
                            {item.clientAvatarUrl ? (
                              <Image
                                src={item.clientAvatarUrl}
                                alt={item.clientName}
                                width={96}
                                height={96}
                                unoptimized
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] font-medium text-slate-500">
                                {item.clientName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{item.clientName}</div>
                            {item.sourceLabel && (
                              <div className="text-xs text-slate-500">{item.sourceLabel}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-amber-500">★</span> {item.rating}/5
                      </td>
                      <td className="px-5 py-3 max-w-[220px]">
                        <span className="line-clamp-2 text-slate-500">
                          &ldquo;{item.feedbackText.slice(0, 80)}
                          {item.feedbackText.length > 80 ? '…' : ''}&rdquo;
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{item.sortOrder}</td>
                      <td className="px-5 py-3">
                        {item.isVisible ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Nähtav</span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">Peidetud</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleVisibility(item.id, item.isVisible)}
                            className="rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            {item.isVisible ? 'Peida' : 'Näita'}
                          </button>
                          <button
                            onClick={() => { setDraft(toDraft(item)); setIsDrawerOpen(true); }}
                            className="rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Muuda
                          </button>
                          <button
                            onClick={() => void deleteFeedback(item.id, item.clientName)}
                            className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Kustuta
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-[#e5e7eb] bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">{draft.id ? 'Muuda tagasisidet' : 'Lisa tagasiside'}</h2>
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Sulge
              </button>
            </div>

            <div className="space-y-6 p-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}
              <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">Kliendi andmed</p>
                <div className="space-y-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-700">Kliendi nimi</span>
                    <input
                      value={draft.clientName}
                      onChange={(e) => setDraft((p) => ({ ...p, clientName: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
                      placeholder="nt Maria K."
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-[88px_1fr] sm:items-start">
                    <div className="h-20 w-20 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-slate-100">
                      {draft.clientAvatarUrl?.trim() ? (
                        <Image
                          src={draft.clientAvatarUrl.trim()}
                          alt=""
                          width={160}
                          height={160}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                          {avatarInitials}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">Avatar (URL või upload)</p>
                      <div
                        className={`rounded-xl border border-dashed px-4 py-3 transition-colors ${
                          avatarDragOver ? 'border-[#c24d86] bg-[#fff1f8]' : 'border-[#e5e7eb] bg-white'
                        }`}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAvatarDragOver(true);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAvatarDragOver(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAvatarDragOver(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAvatarDragOver(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) void uploadAvatarFile(file);
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void uploadAvatarFile(file);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={isUploadingAvatar}
                            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {isUploadingAvatar ? 'Laen üles...' : 'Vali fail'}
                          </button>
                          <span className="text-xs text-slate-500">või lohista pilt siia</span>
                          {draft.clientAvatarUrl?.trim() && (
                            <button
                              type="button"
                              onClick={() => setDraft((p) => ({ ...p, clientAvatarUrl: '' }))}
                              className="ml-auto text-xs font-semibold text-red-600 hover:text-red-700"
                            >
                              Eemalda
                            </button>
                          )}
                        </div>
                      </div>

                      <label className="block">
                        <span className="block text-xs font-medium text-slate-500">või kleebi URL</span>
                        <input
                          value={draft.clientAvatarUrl}
                          onChange={(e) => setDraft((p) => ({ ...p, clientAvatarUrl: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
                          placeholder="https://..."
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">Tagasiside ja hinnang</p>
                <div className="space-y-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-700">Hinnang (1–5)</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={draft.rating}
                      onChange={(e) => setDraft((p) => ({ ...p, rating: Number(e.target.value) || 5 }))}
                      className="mt-1 w-20 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-700">Tsitaat / tagasiside</span>
                    <textarea
                      value={draft.feedbackText}
                      onChange={(e) => setDraft((p) => ({ ...p, feedbackText: e.target.value }))}
                      className="mt-1 min-h-24 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
                      placeholder="Klienti tsitaat..."
                      rows={4}
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-700">Allikas (valikuline)</span>
                    <input
                      value={draft.sourceLabel}
                      onChange={(e) => setDraft((p) => ({ ...p, sourceLabel: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
                      placeholder="Facebook, Google"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-700">Teenuse ID (valikuline)</span>
                    <input
                      value={draft.serviceId}
                      onChange={(e) => setDraft((p) => ({ ...p, serviceId: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
                      placeholder="gel-manicure"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">Järjekord ja nähtavus</p>
                <div className="flex flex-wrap items-center gap-6">
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-700">Järjekord</span>
                    <input
                      type="number"
                      value={draft.sortOrder}
                      onChange={(e) => setDraft((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))}
                      className="mt-1 w-24 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
                    />
                  </label>
                  <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={draft.isVisible}
                      onChange={(e) => setDraft((p) => ({ ...p, isVisible: e.target.checked }))}
                      className="rounded border-[#e5e7eb] text-slate-700"
                    />
                    Nähtav avalehel
                  </label>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 border-t border-[#e5e7eb] bg-white px-6 py-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => void saveFeedback()}
                  disabled={!draft.clientName.trim() || isSaving}
                  className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  {isSaving ? 'Salvestan...' : 'Salvesta tagasiside'}
                </button>
                <button type="button" onClick={() => setIsDrawerOpen(false)} className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Tühista
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
