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
    <main className="admin-cockpit-bg min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AdminPageHeader
          overline="Sisu"
          title="Galerii (Meie töö)"
          subtitle="Avalehe galerii pildid. Järjekord määrab kuvamise. Esiletõstetud pilt on esimene."
          backHref="/admin"
          backLabel="Halduspaneel"
        />

        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="admin-panel mb-6 p-5">
          <p className="admin-section-overline mb-3">Lisa uus pilt</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="Pildi URL või base64"
              className="input-premium"
            />
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Kirjeldus (valikuline)"
              className="input-premium"
            />
            <label className="flex flex-col">
              <span className="type-small admin-muted mb-1">Või lae fail</span>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFromFile(file);
                }}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 type-small admin-heading">
              <input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} />
              Esiletõstetud (esimene avalehel)
            </label>
            <button onClick={saveImage} disabled={isSaving} className="btn-primary btn-primary-md disabled:opacity-60">
              {isSaving ? 'Salvestan...' : 'Salvesta pilt'}
            </button>
          </div>
        </section>

        <section className="admin-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="type-h4 admin-heading">Pildid</h2>
            <p className="type-small admin-muted">{images.length} pilti</p>
          </div>
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="admin-muted">Galeriis pole pilte. Lisa esimene pilt ülal.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image, index) => (
                <article key={image.id} className="admin-action-tile overflow-hidden">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#fef8fb]">
                    <Image
                      src={image.imageUrl}
                      alt={image.caption || 'Galerii pilt'}
                      width={720}
                      height={384}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                    {image.isFeatured && (
                      <span className="absolute left-2 top-2 rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[10px] font-semibold text-white">
                        Esiletõstetud
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="type-small admin-heading line-clamp-2">{image.caption || 'Ilma kirjelduseta'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => moveImage(index, -1)} className="btn-secondary btn-secondary-sm text-xs">↑</button>
                      <button onClick={() => moveImage(index, 1)} className="btn-secondary btn-secondary-sm text-xs">↓</button>
                      {!image.isFeatured && (
                        <button onClick={() => setFeatured(image.id)} className="btn-secondary btn-secondary-sm text-xs">Esiletõstetud</button>
                      )}
                      <button onClick={() => void deleteImage(image.id, image.caption)} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100">Kustuta</button>
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
