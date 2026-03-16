'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';

type MediaType = 'image' | 'video';

interface HomepageMediaItem {
  key: string;
  label: string;
  section: string;
  imageUrl: string;
  mediaType: MediaType;
  videoLoop: boolean;
  sortOrder: number;
}

interface MediaDraft {
  imageUrl: string;
  label: string;
  section: string;
  mediaType: MediaType;
  videoLoop: boolean;
  sortOrder: number;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

function MediaNotFoundPlaceholder({ type }: { type: MediaType }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb] text-[#6b7280]">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#cfd4dc] bg-white/75">
        {type === 'video' ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3.5" y="6" width="13.5" height="12" rx="2" />
            <path d="M17 11l3.5-2v6L17 13z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <path d="M8 13l2.2-2.2a1 1 0 011.4 0l1.3 1.3a1 1 0 001.4 0l1.7-1.7a1 1 0 011.4 0L20 13.3" />
            <circle cx="9" cy="9" r="1.2" />
          </svg>
        )}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Image not found</p>
    </div>
  );
}

export default function AdminHomepageMediaPage() {
  const [items, setItems] = useState<HomepageMediaItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, MediaDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [brokenPreviews, setBrokenPreviews] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<'all' | string>('all');
  const [newHeroLabel, setNewHeroLabel] = useState('');
  const [newHeroType, setNewHeroType] = useState<MediaType>('image');
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/homepage-media?admin=1', { cache: 'no-store' });
      if (!response.ok) throw new Error('Avalehe meedia laadimine ebaonnestus');
      const data = (await response.json()) as { items?: HomepageMediaItem[] };
      const nextItems = data.items ?? [];
      setItems(nextItems);
      setDrafts(
        nextItems.reduce<Record<string, MediaDraft>>((acc, item) => {
          acc[item.key] = {
            imageUrl: item.imageUrl ?? '',
            label: item.label ?? '',
            section: item.section ?? 'general',
            mediaType: item.mediaType === 'video' ? 'video' : 'image',
            videoLoop: Boolean(item.videoLoop),
            sortOrder: item.sortOrder ?? 0,
          };
          return acc;
        }, {})
      );
      setBrokenPreviews({});
    } catch (loadError) {
      console.error(loadError);
      setError('Avalehe meedia laadimine ebaonnestus.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const grouped = useMemo(() => {
    const source = sectionFilter === 'all' ? items : items.filter((item) => item.section === sectionFilter);
    return source.reduce<Record<string, HomepageMediaItem[]>>((acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    }, {});
  }, [items, sectionFilter]);

  const sectionOptions = useMemo(() => {
    const unique = Array.from(new Set(items.map((item) => item.section)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [items]);

  const changedCount = items.reduce((sum, item) => {
    const draft = drafts[item.key];
    if (!draft) return sum;
    const changed =
      draft.imageUrl !== (item.imageUrl ?? '') ||
      draft.label !== (item.label ?? '') ||
      draft.section !== (item.section ?? 'general') ||
      draft.mediaType !== (item.mediaType === 'video' ? 'video' : 'image') ||
      draft.videoLoop !== Boolean(item.videoLoop) ||
      draft.sortOrder !== (item.sortOrder ?? 0);
    return sum + (changed ? 1 : 0);
  }, 0);
  const hasChanges = changedCount > 0;

  const updateDraft = (key: string, patch: Partial<MediaDraft>) => {
    setDrafts((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return { ...prev, [key]: { ...current, ...patch } };
    });
    setBrokenPreviews((prev) => ({ ...prev, [key]: false }));
  };

  const saveAll = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = items.map((item) => {
        const draft = drafts[item.key];
        return {
          key: item.key,
          imageUrl: (draft?.imageUrl ?? '').trim(),
          label: draft?.label ?? item.label,
          section: draft?.section ?? item.section,
          sortOrder: draft?.sortOrder ?? item.sortOrder,
          mediaType: draft?.mediaType ?? item.mediaType,
          videoLoop: Boolean(draft?.videoLoop ?? item.videoLoop),
        };
      });

      const response = await fetch('/api/homepage-media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });
      if (!response.ok) throw new Error('Salvestamine ebaonnestus');
      setSuccess('Avalehe meedia salvestatud.');
      await loadItems();
    } catch (saveError) {
      console.error(saveError);
      setError('Avalehe meedia salvestamine ebaonnestus.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMedia = (key: string) => {
    updateDraft(key, { imageUrl: '' });
    setSuccess('Meedia eemaldatud. Salvesta muudatused.');
  };

  const handleResetMedia = (item: HomepageMediaItem) => {
    updateDraft(item.key, {
      imageUrl: item.imageUrl ?? '',
      label: item.label ?? '',
      section: item.section ?? 'general',
      mediaType: item.mediaType === 'video' ? 'video' : 'image',
      videoLoop: Boolean(item.videoLoop),
      sortOrder: item.sortOrder ?? 0,
    });
  };

  const handleUploadFromComputer = async (item: HomepageMediaItem, file?: File | null) => {
    if (!file) return;
    setUploadingKey(item.key);
    setError(null);
    setSuccess(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) throw new Error('Upload failed');
      updateDraft(item.key, {
        imageUrl: dataUrl,
        mediaType: file.type.startsWith('video/') ? 'video' : 'image',
      });
      setSuccess(`"${item.label}" uuendatud. Salvesta muudatused.`);
    } catch (uploadError) {
      console.error(uploadError);
      setError('Meedia upload ebaonnestus. Proovi uuesti.');
    } finally {
      setUploadingKey(null);
    }
  };

  const addNewHeroMedia = () => {
    const normalizedLabel = newHeroLabel.trim() || (newHeroType === 'video' ? 'Hero video' : 'Hero image');
    const keyBase = slugify(normalizedLabel) || (newHeroType === 'video' ? 'hero-video' : 'hero-image');
    const key = `hero_custom_${keyBase}_${Date.now().toString(36)}`;
    const sortOrder = Math.max(1, ...items.filter((item) => item.section === 'hero').map((item) => item.sortOrder)) + 1;

    const newItem: HomepageMediaItem = {
      key,
      label: normalizedLabel,
      section: 'hero',
      imageUrl: '',
      mediaType: newHeroType,
      videoLoop: newHeroType === 'video',
      sortOrder,
    };

    setItems((prev) => [...prev, newItem]);
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        imageUrl: '',
        label: normalizedLabel,
        section: 'hero',
        mediaType: newHeroType,
        videoLoop: newHeroType === 'video',
        sortOrder,
      },
    }));
    setSectionFilter('hero');
    setNewHeroLabel('');
    setSuccess('Uus hero meedia lisatud. Lisa URL voi uploadi fail ning salvesta.');
  };

  return (
    <main className="admin-cockpit-bg px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="admin-cockpit-shell mb-6 rounded-[28px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6b7280]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#111827]">Avalehe meedia</h1>
              <p className="mt-2 text-sm text-[#4b5563]">
                Hero jaoks saad nuud hallata nii pilte kui videoid (loop ja regular). Koik muudatused salvestuvad andmebaasi.
              </p>
            </div>
            <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-sm text-[#4b5563]" href="/admin">
              Halduspaneel
            </Link>
          </div>
        </header>

        <AdminQuickActions />

        {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        <section className="admin-panel mb-5 rounded-3xl p-5">
          <h2 className="text-lg font-semibold text-[#111827]">Lisa uus Hero meedia</h2>
          <p className="mt-1 text-sm text-[#4b5563]">Saad lisada eraldi hero pildi voi video ning seada selle loop reziimi.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <input
              value={newHeroLabel}
              onChange={(event) => setNewHeroLabel(event.target.value)}
              placeholder="Nimi (nt Hero intro video)"
              className="rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#9ca3af]"
            />
            <select
              value={newHeroType}
              onChange={(event) => setNewHeroType(event.target.value === 'video' ? 'video' : 'image')}
              className="rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm font-medium text-[#374151]"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
            <button
              type="button"
              onClick={addNewHeroMedia}
              className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb]"
            >
              Lisa Hero meedia
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={saving || !hasChanges}
              className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Salvestan...' : 'Salvesta'}
            </button>
          </div>
        </section>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
              Sektsioon
              <select
                value={sectionFilter}
                onChange={(event) => setSectionFilter(event.target.value)}
                className="ml-2 rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-sm font-medium text-[#374151]"
              >
                <option value="all">Koik</option>
                {sectionOptions.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </label>
            <span className="rounded-full border border-[#d1d5db] bg-white px-3 py-1 text-xs text-[#4b5563]">
              Muudetud: {changedCount}
            </span>
          </div>
          <button
            onClick={() => void loadItems()}
            className="rounded-xl border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#4b5563]"
          >
            Varskenda
          </button>
        </div>

        {loading ? (
          <section className="admin-panel rounded-3xl p-6 text-sm text-[#6b7280]">Laen avalehe meediat...</section>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([section, sectionItems]) => (
              <section key={section} className="admin-panel rounded-3xl p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#111827]">{section}</h2>
                  <span className="rounded-full border border-[#d1d5db] bg-white px-3 py-1 text-xs text-[#4b5563]">
                    {sectionItems.length} kirjet
                  </span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sectionItems.map((item) => {
                    const draft = drafts[item.key];
                    if (!draft) return null;
                    const draftValue = draft.imageUrl.trim();
                    const isBroken = brokenPreviews[item.key];
                    const hasMedia = draftValue.length > 0 && !isBroken;
                    const isChanged =
                      draft.imageUrl !== (item.imageUrl ?? '') ||
                      draft.label !== (item.label ?? '') ||
                      draft.section !== (item.section ?? 'general') ||
                      draft.mediaType !== (item.mediaType === 'video' ? 'video' : 'image') ||
                      draft.videoLoop !== Boolean(item.videoLoop) ||
                      draft.sortOrder !== (item.sortOrder ?? 0);
                    const isUploading = uploadingKey === item.key;

                    return (
                      <article
                        key={item.key}
                        className={`rounded-2xl border bg-white p-3 transition ${
                          isChanged ? 'border-[#d9a9c1] shadow-[0_12px_26px_-24px_rgba(173,74,123,0.62)]' : 'border-[#e5e7eb]'
                        }`}
                      >
                        <div className="relative mb-3 h-44 w-full overflow-hidden rounded-xl border border-[#e5e7eb] bg-[#f3f4f6]">
                          {hasMedia ? (
                            draft.mediaType === 'video' ? (
                              <video
                                src={draftValue}
                                className="h-full w-full object-cover"
                                muted
                                loop={draft.videoLoop}
                                playsInline
                                autoPlay={draft.videoLoop}
                                controls={!draft.videoLoop}
                                onError={() => setBrokenPreviews((prev) => ({ ...prev, [item.key]: true }))}
                              />
                            ) : (
                              <Image
                                src={draftValue}
                                alt={draft.label || item.label}
                                fill
                                className="object-cover"
                                unoptimized
                                onError={() => setBrokenPreviews((prev) => ({ ...prev, [item.key]: true }))}
                              />
                            )
                          ) : (
                            <MediaNotFoundPlaceholder type={draft.mediaType} />
                          )}
                        </div>

                        <label className="block text-xs font-medium text-[#4b5563]">
                          Nimi
                          <input
                            value={draft.label}
                            onChange={(event) => updateDraft(item.key, { label: event.target.value })}
                            className="mt-1 w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-xs outline-none focus:border-[#9ca3af]"
                          />
                        </label>
                        <p className="mt-1 text-xs text-[#6b7280]">{item.key}</p>

                        <label className="mt-2 block text-xs font-medium text-[#4b5563]">
                          URL / data URL
                          <input
                            value={draft.imageUrl}
                            onChange={(event) => updateDraft(item.key, { imageUrl: event.target.value })}
                            placeholder={draft.mediaType === 'video' ? 'https://...video.mp4' : 'https://...'}
                            className="mt-1 w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-xs outline-none focus:border-[#9ca3af]"
                          />
                        </label>

                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <label className="block text-xs font-medium text-[#4b5563]">
                            Tüüp
                            <select
                              value={draft.mediaType}
                              onChange={(event) => updateDraft(item.key, { mediaType: event.target.value === 'video' ? 'video' : 'image' })}
                              className="mt-1 w-full rounded-xl border border-[#d1d5db] bg-white px-2 py-2 text-xs"
                            >
                              <option value="image">Image</option>
                              <option value="video">Video</option>
                            </select>
                          </label>
                          <label className="block text-xs font-medium text-[#4b5563]">
                            Sektsioon
                            <input
                              value={draft.section}
                              onChange={(event) => updateDraft(item.key, { section: event.target.value })}
                              className="mt-1 w-full rounded-xl border border-[#d1d5db] bg-white px-2 py-2 text-xs"
                            />
                          </label>
                          <label className="block text-xs font-medium text-[#4b5563]">
                            Järjekord
                            <input
                              type="number"
                              value={draft.sortOrder}
                              onChange={(event) => updateDraft(item.key, { sortOrder: Number(event.target.value) || 0 })}
                              className="mt-1 w-full rounded-xl border border-[#d1d5db] bg-white px-2 py-2 text-xs"
                            />
                          </label>
                        </div>

                        {draft.mediaType === 'video' && (
                          <label className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-[#4b5563]">
                            <input
                              type="checkbox"
                              checked={draft.videoLoop}
                              onChange={(event) => updateDraft(item.key, { videoLoop: event.target.checked })}
                              className="h-4 w-4 rounded border-[#d1d5db]"
                            />
                            Loop video
                          </label>
                        )}

                        <input
                          ref={(element) => {
                            fileInputsRef.current[item.key] = element;
                          }}
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            void handleUploadFromComputer(item, file);
                            event.currentTarget.value = '';
                          }}
                        />

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputsRef.current[item.key]?.click()}
                            disabled={isUploading}
                            className="rounded-xl border border-[#d1d5db] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
                          >
                            {isUploading ? 'Uploadin...' : 'Upload from computer'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMedia(item.key)}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Delete image/video
                          </button>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleResetMedia(item)}
                            className="text-xs font-semibold text-[#6b7280] underline-offset-2 hover:text-[#374151] hover:underline"
                          >
                            Taasta algne
                          </button>
                          {isChanged && <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9b4b75]">Muudetud</span>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
