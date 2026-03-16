'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';

interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string;
  isFeatured: boolean;
}

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImages = async () => {
    setError(null);
    const response = await fetch('/api/gallery?admin=1', { cache: 'no-store' });
    const data = (await response.json()) as { images?: GalleryImage[] };
    setImages(data.images ?? []);
  };

  useEffect(() => {
    void loadImages();
  }, []);

  const uploadFromFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      if (!value) return;
      setImageUrl(value);
    };
    reader.readAsDataURL(file);
  };

  const saveImage = async () => {
    if (!imageUrl) {
      setError('Lisa pildi URL voi lae fail ules.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, caption, isFeatured }),
      });
      if (!response.ok) throw new Error('Pildi salvestamine ebaonnestus');
      setImageUrl('');
      setCaption('');
      setIsFeatured(false);
      await loadImages();
    } catch (saveError) {
      console.error(saveError);
      setError('Pildi salvestamine ebaonnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const setFeatured = async (id: string) => {
    await fetch('/api/gallery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isFeatured: true }),
    });
    await loadImages();
  };

  const deleteImage = async (id: string, imageCaption: string) => {
    const label = imageCaption.trim() || 'ilma kirjelduseta pilt';
    const isConfirmed = window.confirm(`Kas kustutada "${label}"? Seda tegevust ei saa tagasi votta.`);
    if (!isConfirmed) return;

    await fetch(`/api/gallery?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadImages();
  };

  const moveImage = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setImages(reordered);
    await fetch('/api/gallery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: reordered.map((image) => image.id) }),
    });
    await loadImages();
  };

  return (
    <main className="admin-cockpit-bg px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="admin-cockpit-shell mb-6 rounded-[28px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6b7280]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#111827]">Galerii haldur</h1>
              <p className="mt-2 text-sm text-[#4b5563]">Lae pilte ules, sorteeri ja margi esile tostetud foto.</p>
            </div>
            <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-sm text-[#4b5563]" href="/admin">
              Halduspaneel
            </Link>
          </div>
        </header>

        <AdminQuickActions />

        {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <section className="admin-panel-soft mb-6 rounded-3xl p-5">
          <h2 className="text-lg font-semibold text-[#111827]">Lisa uus pilt</h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="Pildi URL voi base64"
              className="rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 text-sm outline-none focus:border-[#9ca3af]"
            />
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Kirjeldus"
              className="rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 text-sm outline-none focus:border-[#9ca3af]"
            />
            <label className="rounded-xl border border-dashed border-[#dcc3d5] bg-[#fff6fb] px-3 py-2 text-sm text-[#4b5563]">
              Lae fail
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-xs"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFromFile(file);
                }}
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-[#4b5563]">
              <input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} />
              Margi featured pildiks
            </label>
            <button
              onClick={saveImage}
              disabled={isSaving}
              className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? 'Salvestan...' : 'Salvesta pilt'}
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <article key={image.id} className="admin-panel overflow-hidden rounded-3xl">
              <Image
                src={image.imageUrl}
                alt={image.caption || 'Galerii pilt'}
                width={720}
                height={384}
                unoptimized
                className="h-48 w-full object-cover"
              />
              <div className="p-4">
                <p className="text-sm font-medium text-[#111827]">{image.caption || 'Ilma kirjelduseta'}</p>
                {image.isFeatured && (
                  <span className="mt-2 inline-block rounded-full bg-[#f9e9f2] px-2.5 py-1 text-xs text-[#8a4f73]">
                    Esile tostetud
                  </span>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => moveImage(index, -1)}
                    className="rounded-lg border border-[#d1d5db] px-2 py-1 text-xs text-[#4b5563]"
                  >
                    Ules
                  </button>
                  <button
                    onClick={() => moveImage(index, 1)}
                    className="rounded-lg border border-[#d1d5db] px-2 py-1 text-xs text-[#4b5563]"
                  >
                    Alla
                  </button>
                  <button
                    onClick={() => setFeatured(image.id)}
                    className="rounded-lg border border-[#e8c9da] bg-[#fff5fb] px-2 py-1 text-xs text-[#8a4f73]"
                  >
                    Margi featured
                  </button>
                  <button
                    onClick={() => void deleteImage(image.id, image.caption)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700"
                  >
                    Kustuta
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
