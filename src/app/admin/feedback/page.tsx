'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (!response.ok) throw new Error('Salvestamine ebaonnestus');
      await loadFeedback();
      setIsDrawerOpen(false);
      setDraft(emptyDraft);
      setToast('Tagasiside salvestatud');
    } catch {
      setError('Tagasiside salvestamine ebaonnestus.');
    } finally {
      setIsSaving(false);
    }
  };

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
    <main className="admin-cockpit-bg min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
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
          <div className="fixed right-4 top-6 z-[70] rounded-xl border border-[#edd9e3] bg-white px-4 py-2 text-sm font-medium text-[#6a3b57] shadow-lg">
            {toast}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="admin-panel overflow-hidden">
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="type-h4 admin-heading">Tagasiside nimekiri</h2>
            <p className="type-small admin-muted">{items.length} kirjet</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--color-border-card-soft)] bg-[#fef8fb]/60">
                <tr>
                  <th className="px-4 py-3 font-semibold admin-heading">Pilt / Nimi</th>
                  <th className="px-4 py-3 font-semibold admin-heading">Hinnang</th>
                  <th className="px-4 py-3 font-semibold admin-heading">Tsitaat</th>
                  <th className="px-4 py-3 font-semibold admin-heading">Järjekord</th>
                  <th className="px-4 py-3 font-semibold admin-heading">Nähtavus</th>
                  <th className="px-4 py-3 font-semibold admin-heading text-right">Tegevused</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center admin-muted">
                      Tagasisidet pole. Lisa esimene avalehe testimoniaal.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--color-border-card-soft)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-xl border border-[#efdfeb] bg-[#f8eef5]">
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
                              <div className="flex h-full items-center justify-center text-[10px] font-medium text-[#8e7683]">
                                {item.clientName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="admin-heading font-medium">{item.clientName}</div>
                            {item.sourceLabel && (
                              <div className="type-small admin-muted">{item.sourceLabel}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[var(--color-primary)]">★</span> {item.rating}/5
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className="line-clamp-2 admin-muted">
                          &ldquo;{item.feedbackText.slice(0, 80)}
                          {item.feedbackText.length > 80 ? '…' : ''}&rdquo;
                        </span>
                      </td>
                      <td className="px-4 py-3 admin-muted">{item.sortOrder}</td>
                      <td className="px-4 py-3">
                        {item.isVisible ? (
                          <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">Nähtav</span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">Peidetud</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleVisibility(item.id, item.isVisible)}
                            className="btn-secondary btn-secondary-sm"
                          >
                            {item.isVisible ? 'Peida' : 'Näita'}
                          </button>
                          <button
                            onClick={() => { setDraft(toDraft(item)); setIsDrawerOpen(true); }}
                            className="btn-secondary btn-secondary-sm"
                          >
                            Muuda
                          </button>
                          <button
                            onClick={() => void deleteFeedback(item.id, item.clientName)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
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
            className="absolute inset-0 bg-[#281a25]/40 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-[#e9dce5] bg-[linear-gradient(180deg,#fff_0%,#fff8fc_100%)] shadow-[-24px_0_48px_-24px_rgba(38,20,31,0.35)]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#f0e2eb] bg-white/95 px-6 py-4 backdrop-blur-sm">
              <h2 className="type-h4 admin-heading">{draft.id ? 'Muuda tagasisidet' : 'Lisa tagasiside'}</h2>
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="btn-secondary btn-secondary-sm">
                Sulge
              </button>
            </div>

            <div className="space-y-6 p-6">
              <section className="admin-panel p-5">
                <p className="admin-section-overline mb-3">Kliendi andmed</p>
                <div className="space-y-4">
                  <label className="block">
                    <span className="block text-sm font-medium admin-heading">Kliendi nimi</span>
                    <input
                      value={draft.clientName}
                      onChange={(e) => setDraft((p) => ({ ...p, clientName: e.target.value }))}
                      className="input-premium mt-1"
                      placeholder="nt Maria K."
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium admin-heading">Avatar / pildi URL (valikuline)</span>
                    <input
                      value={draft.clientAvatarUrl}
                      onChange={(e) => setDraft((p) => ({ ...p, clientAvatarUrl: e.target.value }))}
                      className="input-premium mt-1"
                      placeholder="https://..."
                    />
                  </label>
                </div>
              </section>

              <section className="admin-panel p-5">
                <p className="admin-section-overline mb-3">Tagasiside ja hinnang</p>
                <div className="space-y-4">
                  <label className="block">
                    <span className="block text-sm font-medium admin-heading">Hinnang (1–5)</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={draft.rating}
                      onChange={(e) => setDraft((p) => ({ ...p, rating: Number(e.target.value) || 5 }))}
                      className="input-premium mt-1 w-20"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium admin-heading">Tsitaat / tagasiside</span>
                    <textarea
                      value={draft.feedbackText}
                      onChange={(e) => setDraft((p) => ({ ...p, feedbackText: e.target.value }))}
                      className="input-premium mt-1 min-h-24 w-full"
                      placeholder="Klienti tsitaat..."
                      rows={4}
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium admin-heading">Allikas (valikuline)</span>
                    <input
                      value={draft.sourceLabel}
                      onChange={(e) => setDraft((p) => ({ ...p, sourceLabel: e.target.value }))}
                      className="input-premium mt-1"
                      placeholder="Facebook, Google"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium admin-heading">Teenuse ID (valikuline)</span>
                    <input
                      value={draft.serviceId}
                      onChange={(e) => setDraft((p) => ({ ...p, serviceId: e.target.value }))}
                      className="input-premium mt-1"
                      placeholder="gel-manicure"
                    />
                  </label>
                </div>
              </section>

              <section className="admin-panel p-5">
                <p className="admin-section-overline mb-3">Järjekord ja nähtavus</p>
                <div className="flex flex-wrap items-center gap-6">
                  <label className="block">
                    <span className="block text-sm font-medium admin-heading">Järjekord</span>
                    <input
                      type="number"
                      value={draft.sortOrder}
                      onChange={(e) => setDraft((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))}
                      className="input-premium mt-1 w-24"
                    />
                  </label>
                  <label className="flex items-center gap-2 pt-6 text-sm admin-heading">
                    <input
                      type="checkbox"
                      checked={draft.isVisible}
                      onChange={(e) => setDraft((p) => ({ ...p, isVisible: e.target.checked }))}
                    />
                    Nähtav avalehel
                  </label>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 border-t border-[#f0e2eb] bg-white/95 px-6 py-4 backdrop-blur-sm">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => void saveFeedback()}
                  disabled={!draft.clientName.trim() || isSaving}
                  className="btn-primary btn-primary-md disabled:opacity-50"
                >
                  {isSaving ? 'Salvestan...' : 'Salvesta tagasiside'}
                </button>
                <button type="button" onClick={() => setIsDrawerOpen(false)} className="btn-secondary btn-secondary-md">
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
