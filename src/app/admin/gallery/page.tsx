'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
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
      setError('Lisa pildi URL või lae fail üles.');
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
      if (!response.ok) throw new Error('Pildi salvestamine ebaõnnestus');
      setImageUrl('');
      setCaption('');
      setIsFeatured(false);
      await loadImages();
    } catch (saveError) {
      console.error(saveError);
      setError('Pildi salvestamine ebaõnnestus.');
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

  const deleteImage = async (id: string) => {
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
    <main className="admin-shell min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff4fa_40%,_#f7ecf4_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="admin-header mb-6 rounded-3xl border border-[#e8e2dc] bg-white/90 p-6 shadow-[0_28px_42px_-34px_rgba(57,45,39,0.42)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#b983a2]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#2f2230]">Galerii haldur</h1>
              <p className="mt-2 text-sm text-[#6f5a6a]">Lae pilte üles, sorteeri ja märgi esile tõstetud foto.</p>
            </div>
            <Link className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-sm text-[#6f5d53]" href="/admin">
              Halduspaneel
            </Link>
          </div>
        </header>

        <AdminQuickActions />

        {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <section className="admin-surface-soft mb-6 rounded-3xl border border-[#e8e0d9] bg-[linear-gradient(165deg,#fff_0%,#fbf7f2_100%)] p-5 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.28)]">
          <h2 className="text-lg font-semibold text-[#2f2230]">Lisa uus pilt</h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="Pildi URL või base64"
              className="rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 text-sm outline-none focus:border-[#8a5e76]"
            />
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Kirjeldus"
              className="rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 text-sm outline-none focus:border-[#8a5e76]"
            />
            <label className="rounded-xl border border-dashed border-[#dcc3d5] bg-[#fff6fb] px-3 py-2 text-sm text-[#6f5a6a]">
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
            <label className="inline-flex items-center gap-2 text-sm text-[#6f5a6a]">
              <input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} />
              Märgi featured pildiks
            </label>
            <button
              onClick={saveImage}
              disabled={isSaving}
              className="rounded-xl bg-[#8a5e76] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? 'Salvestan...' : 'Salvesta pilt'}
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <article
              key={image.id}
              className="admin-surface overflow-hidden rounded-3xl border border-[#ece3db] bg-white/95 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.35)]"
            >
              <Image
                src={image.imageUrl}
                alt={image.caption || 'Galerii pilt'}
                width={720}
                height={384}
                unoptimized
                className="h-48 w-full object-cover"
              />
              <div className="p-4">
                <p className="text-sm font-medium text-[#2f2230]">{image.caption || 'Ilma kirjelduseta'}</p>
                {image.isFeatured && (
                  <span className="mt-2 inline-block rounded-full bg-[#f9e9f2] px-2.5 py-1 text-xs text-[#8a4f73]">
                    Esile tõstetud
                  </span>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => moveImage(index, -1)}
                    className="rounded-lg border border-[#ead8e2] px-2 py-1 text-xs text-[#6f5a6a]"
                  >
                    Üles
                  </button>
                  <button
                    onClick={() => moveImage(index, 1)}
                    className="rounded-lg border border-[#ead8e2] px-2 py-1 text-xs text-[#6f5a6a]"
                  >
                    Alla
                  </button>
                  <button
                    onClick={() => setFeatured(image.id)}
                    className="rounded-lg border border-[#e8c9da] bg-[#fff5fb] px-2 py-1 text-xs text-[#8a4f73]"
                  >
                    Märgi featured
                  </button>
                  <button
                    onClick={() => deleteImage(image.id)}
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
