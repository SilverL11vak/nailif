'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface GalleryImage {
  id: string;
  imageUrl: string;
  title: { et: string; en: string };
  tag: { et: string; en: string };
  description: { et: string; en: string };
  ctaHref: string;
  isFeatured: boolean;
  isVisible: boolean;
  sortOrder: number;
}

interface GalleryDraft {
  titleEt: string;
  titleEn: string;
  tagEt: string;
  tagEn: string;
  descriptionEt: string;
  descriptionEn: string;
  ctaHref: string;
  imageUrl: string;
  isFeatured: boolean;
  isVisible: boolean;
}

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [drafts, setDrafts] = useState<Record<string, GalleryDraft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);

  const [newImageUrl, setNewImageUrl] = useState('');
  const [newTitleEt, setNewTitleEt] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newTagEt, setNewTagEt] = useState('');
  const [newTagEn, setNewTagEn] = useState('');
  const [newDescriptionEt, setNewDescriptionEt] = useState('');
  const [newDescriptionEn, setNewDescriptionEn] = useState('');
  const [newCtaHref, setNewCtaHref] = useState('');
  const [newIsFeatured, setNewIsFeatured] = useState(false);
  const [newIsVisible, setNewIsVisible] = useState(true);

  const makeDraft = (image: GalleryImage): GalleryDraft => ({
    titleEt: image.title?.et ?? '',
    titleEn: image.title?.en ?? '',
    tagEt: image.tag?.et ?? '',
    tagEn: image.tag?.en ?? '',
    descriptionEt: image.description?.et ?? '',
    descriptionEn: image.description?.en ?? '',
    ctaHref: image.ctaHref ?? '',
    imageUrl: image.imageUrl ?? '',
    isFeatured: Boolean(image.isFeatured),
    isVisible: image.isVisible ?? true,
  });

  const loadImages = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/gallery?admin=1', { cache: 'no-store' });
      const data = (await response.json()) as { images?: GalleryImage[] };
      const loaded = Array.isArray(data.images) ? data.images : [];
      setImages(loaded);
      const nextDrafts: Record<string, GalleryDraft> = {};
      for (const image of loaded) {
        nextDrafts[image.id] = makeDraft(image);
      }
      setDrafts(nextDrafts);
    } catch (loadError) {
      console.error(loadError);
      setError('Galerii laadimine ebaonnestus.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  const setDraft = (id: string, patch: Partial<GalleryDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {
          titleEt: '',
          titleEn: '',
          tagEt: '',
          tagEn: '',
          descriptionEt: '',
          descriptionEn: '',
          ctaHref: '',
          imageUrl: '',
          isFeatured: false,
          isVisible: true,
        }),
        ...patch,
      },
    }));
  };

  const uploadFromFile = async (file: File, target: 'new' | string) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      if (!value) return;
      if (target === 'new') {
        setNewImageUrl(value);
      } else {
        setDraft(target, { imageUrl: value });
      }
    };
    reader.readAsDataURL(file);
  };

  const saveNewImage = async () => {
    if (!newImageUrl.trim()) {
      setError('Lisa pildi URL voi lae fail ules.');
      return;
    }
    if (!newTitleEt.trim()) {
      setError('Lisa pildile pealkiri ET.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: newImageUrl.trim(),
          title: { et: newTitleEt.trim(), en: newTitleEn.trim() || newTitleEt.trim() },
          tag: { et: newTagEt.trim(), en: newTagEn.trim() || newTagEt.trim() },
          description: { et: newDescriptionEt.trim(), en: newDescriptionEn.trim() || newDescriptionEt.trim() },
          ctaHref: newCtaHref.trim(),
          isFeatured: newIsFeatured,
          isVisible: newIsVisible,
        }),
      });
      if (!response.ok) throw new Error('Save failed');

      setNewImageUrl('');
      setNewTitleEt('');
      setNewTitleEn('');
      setNewTagEt('');
      setNewTagEn('');
      setNewDescriptionEt('');
      setNewDescriptionEn('');
      setNewCtaHref('');
      setNewIsFeatured(false);
      setNewIsVisible(true);
      await loadImages();
    } catch (saveError) {
      console.error(saveError);
      setError('Pildi salvestamine ebaonnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveImage = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;

    setError(null);
    try {
      const response = await fetch('/api/gallery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          imageUrl: draft.imageUrl.trim(),
          title: { et: draft.titleEt.trim(), en: draft.titleEn.trim() || draft.titleEt.trim() },
          tag: { et: draft.tagEt.trim(), en: draft.tagEn.trim() || draft.tagEt.trim() },
          description: {
            et: draft.descriptionEt.trim(),
            en: draft.descriptionEn.trim() || draft.descriptionEt.trim(),
          },
          ctaHref: draft.ctaHref.trim(),
          isFeatured: draft.isFeatured,
          isVisible: draft.isVisible,
        }),
      });
      if (!response.ok) throw new Error('Update failed');
      await loadImages();
      setEditingImageId(null);
    } catch (updateError) {
      console.error(updateError);
      setError('Pildi uuendamine ebaonnestus.');
    }
  };

  const moveImage = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const reordered = [...images];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setImages(reordered);

    try {
      await fetch('/api/gallery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((image) => image.id) }),
      });
      await loadImages();
    } catch (reorderError) {
      console.error(reorderError);
      setError('Jarjekorra salvestamine ebaonnestus.');
    }
  };

  const deleteImage = async (id: string, title: string) => {
    const label = title.trim() || 'nimeta pilt';
    if (!window.confirm(`Kas kustutada "${label}"?`)) return;

    try {
      await fetch(`/api/gallery?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadImages();
    } catch (deleteError) {
      console.error(deleteError);
      setError('Pildi kustutamine ebaonnestus.');
    }
  };

  return (
    <main className="admin-v2-page">
      <div className="admin-v2-container py-8">
        <AdminPageHeader
          overline="Sisu"
          title="Galerii (Meie too)"
          subtitle="Muuda taagi, pealkirja, kirjeldust, CTA-linki, nahtavust, featured-olekut ja jarjekorda."
          backHref="/admin"
          backLabel="Halduspaneel"
        />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="admin-v2-surface mb-7 p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">Lisa uus pilt</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Pildi URL</label>
              <input
                value={newImageUrl}
                onChange={(event) => setNewImageUrl(event.target.value)}
                placeholder="https://..."
                className="admin-v2-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Pealkiri (homepage title)</label>
              <input
                value={newTitleEt}
                onChange={(event) => setNewTitleEt(event.target.value)}
                placeholder="Kroom maniküür"
                className="admin-v2-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Title EN</label>
              <input
                value={newTitleEn}
                onChange={(event) => setNewTitleEn(event.target.value)}
                placeholder="Chrome manicure"
                className="admin-v2-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Taag (homepage tag)</label>
              <input
                value={newTagEt}
                onChange={(event) => setNewTagEt(event.target.value)}
                placeholder="SIGNATUUR"
                className="admin-v2-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Tag EN</label>
              <input
                value={newTagEn}
                onChange={(event) => setNewTagEn(event.target.value)}
                placeholder="SIGNATURE"
                className="admin-v2-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">CTA link (optional)</label>
              <input
                value={newCtaHref}
                onChange={(event) => setNewCtaHref(event.target.value)}
                placeholder="/book"
                className="admin-v2-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Kirjeldus (optional)</label>
              <textarea
                value={newDescriptionEt}
                onChange={(event) => setNewDescriptionEt(event.target.value)}
                rows={2}
                placeholder="Luhike abitekst avalehe kaardile"
                className="admin-v2-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Description EN (optional)</label>
              <textarea
                value={newDescriptionEn}
                onChange={(event) => setNewDescriptionEn(event.target.value)}
                rows={2}
                placeholder="Short supporting text for the homepage card"
                className="admin-v2-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Voi lae fail</label>
              <input
                type="file"
                accept="image/*"
                className="admin-v2-input block w-full px-3 py-2 text-sm text-slate-600"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFromFile(file, 'new');
                }}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={newIsVisible}
                onChange={(event) => setNewIsVisible(event.target.checked)}
                className="rounded border-[#e5e7eb] text-slate-700"
              />
              Nahtav avalehel
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={newIsFeatured}
                onChange={(event) => setNewIsFeatured(event.target.checked)}
                className="rounded border-[#e5e7eb] text-slate-700"
              />
              Featured (eelisjargjekord)
            </label>
            <button
              onClick={saveNewImage}
              disabled={isSaving}
              className="admin-v2-btn-primary disabled:opacity-60"
            >
              {isSaving ? 'Salvestan...' : 'Salvesta pilt'}
            </button>
          </div>
        </section>

        <section className="admin-v2-surface p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Galerii kaardid</h2>
            <p className="text-sm text-slate-500">{images.length} pilti</p>
          </div>

          {isLoading ? (
            <p className="py-8 text-sm text-slate-500">Laen galeriid...</p>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-slate-500">Galeriis pole pilte. Lisa esimene pilt ulel.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image, index) => {
                const draft = drafts[image.id] ?? makeDraft(image);
                const previewTitle = draft.titleEt.trim() || 'Pealkiri puudub';
                const previewTag = draft.tagEt.trim() || 'TAAG';
                const previewDescription = draft.descriptionEt.trim();
                const isEditing = editingImageId === image.id;

                return (
                  <article
                    key={image.id}
                    className="admin-v2-card overflow-hidden rounded-2xl"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-slate-50">
                      <Image
                        src={draft.imageUrl || image.imageUrl}
                        alt={previewTitle}
                        fill
                        unoptimized
                        placeholder="empty"
                        className="h-full w-full object-cover object-center"
                      />
                    </div>

                    <div className="space-y-2.5 p-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{previewTag}</p>
                        <p className="mt-1 text-base font-semibold leading-tight text-slate-900">{previewTitle}</p>
                        {previewDescription ? <p className="mt-1 text-xs text-slate-600 line-clamp-2">{previewDescription}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-medium">
                          {draft.isVisible ? (
                            <span className="rounded-full bg-emerald-500/85 px-2 py-1 text-white">Nahtav</span>
                          ) : (
                            <span className="rounded-full bg-slate-700/85 px-2 py-1 text-white">Peidetud</span>
                          )}
                          {draft.isFeatured ? (
                            <span className="rounded-full bg-[#c24d86]/90 px-2 py-1 text-white">Featured</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-1 flex flex-wrap gap-2">
                        <button
                          onClick={() => setEditingImageId((current) => (current === image.id ? null : image.id))}
                          className="admin-v2-btn-secondary rounded-full px-3 py-1.5 text-xs"
                        >
                          {isEditing ? 'Sulge muutmine' : 'Muuda'}
                        </button>
                        <button
                          onClick={() => moveImage(index, -1)}
                          className="admin-v2-btn-ghost rounded-full px-2.5 py-1.5 text-xs"
                          aria-label="Liiguta ules"
                        >
                          Ules
                        </button>
                        <button
                          onClick={() => moveImage(index, 1)}
                          className="admin-v2-btn-ghost rounded-full px-2.5 py-1.5 text-xs"
                          aria-label="Liiguta alla"
                        >
                          Alla
                        </button>
                        <button
                          onClick={() => void deleteImage(image.id, draft.titleEt || image.title.et)}
                          className="admin-v2-btn-danger rounded-full px-3 py-1.5 text-xs"
                        >
                          Kustuta
                        </button>
                      </div>

                      {isEditing && (
                        <div className="space-y-2.5 border-t border-slate-100 pt-3">
                          <label className="block">
                            <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Pealkiri</span>
                            <input
                              value={draft.titleEt}
                              onChange={(event) => setDraft(image.id, { titleEt: event.target.value })}
                              className="admin-v2-input w-full px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Title EN</span>
                            <input
                              value={draft.titleEn}
                              onChange={(event) => setDraft(image.id, { titleEn: event.target.value })}
                              className="admin-v2-input w-full px-3 py-2 text-sm"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Taag</span>
                            <input
                              value={draft.tagEt}
                              onChange={(event) => setDraft(image.id, { tagEt: event.target.value })}
                              className="admin-v2-input w-full px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Tag EN</span>
                            <input
                              value={draft.tagEn}
                              onChange={(event) => setDraft(image.id, { tagEn: event.target.value })}
                              className="admin-v2-input w-full px-3 py-2 text-sm"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Kirjeldus</span>
                            <textarea
                              rows={2}
                              value={draft.descriptionEt}
                              onChange={(event) => setDraft(image.id, { descriptionEt: event.target.value })}
                              className="admin-v2-input w-full px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Description EN</span>
                            <textarea
                              rows={2}
                              value={draft.descriptionEn}
                              onChange={(event) => setDraft(image.id, { descriptionEn: event.target.value })}
                              className="admin-v2-input w-full px-3 py-2 text-sm"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">CTA link</span>
                            <input
                              value={draft.ctaHref}
                              onChange={(event) => setDraft(image.id, { ctaHref: event.target.value })}
                              placeholder="/book"
                              className="admin-v2-input w-full px-3 py-2 text-sm"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Pildi URL</span>
                            <input
                              value={draft.imageUrl}
                              onChange={(event) => setDraft(image.id, { imageUrl: event.target.value })}
                              className="admin-v2-input w-full px-3 py-2 text-sm"
                            />
                          </label>

                          <div>
                            <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Voi asenda failiga</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="admin-v2-input block w-full px-3 py-2 text-sm text-slate-600"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void uploadFromFile(file, image.id);
                              }}
                            />
                          </div>

                          <div className="flex flex-wrap gap-3 pt-1">
                            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={draft.isVisible}
                                onChange={(event) => setDraft(image.id, { isVisible: event.target.checked })}
                                className="rounded border-[#e5e7eb] text-slate-700"
                              />
                              Nahtav
                            </label>
                            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={draft.isFeatured}
                                onChange={(event) => setDraft(image.id, { isFeatured: event.target.checked })}
                                className="rounded border-[#e5e7eb] text-slate-700"
                              />
                              Featured
                            </label>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => void saveImage(image.id)}
                              className="admin-v2-btn-primary rounded-full px-3 py-1.5 text-xs"
                            >
                              Salvesta
                            </button>
                            <button
                              onClick={() => {
                                setDraft(image.id, makeDraft(image));
                                setEditingImageId(null);
                              }}
                              className="admin-v2-btn-secondary rounded-full px-3 py-1.5 text-xs"
                            >
                              Loobu
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
