'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

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

  const updateCaption = async (id: string, newCaption: string) => {
    await fetch('/api/gallery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, caption: newCaption }),
    });
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
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AdminPageHeader
          overline="Sisu"
          title="Galerii (Meie töö)"
          subtitle="Avalehe galerii pildid. Järjekord määrab kuvamise. Esiletõstetud pilt on esimene."
          backHref="/admin"
          backLabel="Halduspaneel"
        />

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-800">{error}</div>}

        <section className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">Lisa uus pilt</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="Pildi URL või base64"
              className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
            />
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Kirjeldus (valikuline)"
              className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
            />
            <label className="flex flex-col">
              <span className="text-sm text-slate-500 mb-1">Või lae fail</span>
              <input
                type="file"
                accept="image/*"
                className="block w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-600"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFromFile(file);
                }}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} className="rounded border-[#e5e7eb] text-slate-700" />
              Esiletõstetud (esimene avalehel)
            </label>
            <button onClick={saveImage} disabled={isSaving} className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60">
              {isSaving ? 'Salvestan...' : 'Salvesta pilt'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Pildid</h2>
            <p className="text-sm text-slate-500">{images.length} pilti</p>
          </div>
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-slate-500">Galeriis pole pilte. Lisa esimene pilt ülal.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image, index) => (
                <article key={image.id} className="group overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200">
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                    <Image
                      src={image.imageUrl}
                      alt={image.caption || 'Galerii pilt'}
                      width={720}
                      height={384}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                    {image.isFeatured && (
                      <span className="absolute left-2 top-2 rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-white">
                        Esiletõstetud
                      </span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-900/0 opacity-0 transition group-hover:opacity-100 group-hover:bg-slate-900/40">
                      <button onClick={() => void deleteImage(image.id, image.caption)} className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-white">
                        Kustuta
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <p className="flex-1 text-sm font-medium text-slate-800 line-clamp-2">{image.caption || 'Ilma kirjelduseta'}</p>
                      <button 
                        onClick={() => {
                          const newCaption = window.prompt('Muuda kirjeldust:', image.caption);
                          if (newCaption !== null) updateCaption(image.id, newCaption);
                        }}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Muuda
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => moveImage(index, -1)} className="rounded-lg border border-[#e5e7eb] bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">↑</button>
                      <button onClick={() => moveImage(index, 1)} className="rounded-lg border border-[#e5e7eb] bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">↓</button>
                      {!image.isFeatured && (
                        <button onClick={() => setFeatured(image.id)} className="rounded-lg border border-[#e5e7eb] bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">Esiletõstetud</button>
                      )}
                      <button onClick={() => void deleteImage(image.id, image.caption)} className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Kustuta</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
