'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  images: string[];
  category: string;
  stock: number;
  active: boolean;
  updatedAt: string;
}

interface ProductDraft {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  images: string[];
  category: string;
  stock: number;
  active: boolean;
}

const emptyProduct: ProductDraft = {
  id: '',
  name: '',
  description: '',
  price: 19,
  imageUrl: '',
  images: [],
  category: 'Aftercare',
  stock: 20,
  active: true,
};

const toDraft = (product: Product): ProductDraft => ({
  id: product.id,
  name: product.name,
  description: product.description,
  price: product.price,
  imageUrl: product.imageUrl ?? '',
  images: product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [],
  category: product.category || 'Aftercare',
  stock: product.stock,
  active: product.active,
});

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyProduct);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProducts = async () => {
    const response = await fetch('/api/products?admin=1', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Tooteid ei saanud laadida');
    }
    const data = (await response.json()) as { products?: Product[] };
    setProducts(data.products ?? []);
  };

  useEffect(() => {
    void loadProducts().catch(() => setError('Toodete laadimine ebaõnnestus.'));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timeout);
  }, [toast]);

  const setFeaturedImage = (image: string) => {
    setDraft((prev) => {
      const nextImages = prev.images.filter((item) => item !== image);
      return {
        ...prev,
        imageUrl: image,
        images: [image, ...nextImages],
      };
    });
  };

  const removeImage = (index: number) => {
    setDraft((prev) => {
      const nextImages = prev.images.filter((_, imageIndex) => imageIndex !== index);
      return {
        ...prev,
        images: nextImages,
        imageUrl: nextImages[0] ?? '',
      };
    });
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    setDraft((prev) => {
      const target = direction === 'left' ? index - 1 : index + 1;
      if (target < 0 || target >= prev.images.length) return prev;
      const nextImages = [...prev.images];
      const [moved] = nextImages.splice(index, 1);
      nextImages.splice(target, 0, moved);
      return {
        ...prev,
        images: nextImages,
        imageUrl: prev.imageUrl || nextImages[0] || '',
      };
    });
  };

  const onUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingImages(true);
    setError(null);
    try {
      const selectedFiles = Array.from(files);
      const oversized = selectedFiles.find((file) => file.size > 3 * 1024 * 1024);
      if (oversized) {
        setError(`Fail on liiga suur: ${oversized.name}. Maksimum 3MB.`);
        return;
      }
      const uploaded = await Promise.all(selectedFiles.map((file) => fileToDataUrl(file)));
      setDraft((prev) => {
        const nextImages = [...prev.images, ...uploaded];
        return {
          ...prev,
          images: nextImages,
          imageUrl: prev.imageUrl || nextImages[0] || '',
        };
      });
      setToast('Pildid lisatud.');
    } catch {
      setError('Piltide laadimine ebaõnnestus.');
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          imageUrl: draft.imageUrl || draft.images[0] || null,
          images: draft.images,
        }),
      });
      if (!response.ok) {
        throw new Error('Salvestamine ebaõnnestus');
      }
      const data = (await response.json()) as { id?: string };
      const savedId = data.id ?? draft.id;
      setDraft(emptyProduct);
      await loadProducts();
      setToast('Toode salvestatud.');
      if (savedId) {
        setHighlightedProductId(savedId);
        setTimeout(() => setHighlightedProductId(null), 2000);
      }
    } catch {
      setError('Toote salvestamine ebaõnnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Kustutamine ebaõnnestus');
      }
      await loadProducts();
      setToast('Toode kustutatud.');
    } catch {
      setError('Toote kustutamine ebaõnnestus.');
    }
  };

  return (
    <main className="admin-shell min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#fff4fa_40%,_#f7ecf4_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="admin-header mb-6 rounded-3xl border border-[#e8e2dc] bg-white/90 p-6 shadow-[0_28px_42px_-34px_rgba(57,45,39,0.42)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#b983a2]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#2f2230]">Tooted</h1>
            </div>
            <div className="flex gap-2 text-sm">
              <Link className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-[#6f5d53]" href="/admin">
                Halduspaneel
              </Link>
              <Link className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-[#6f5d53]" href="/admin/account">
                Konto
              </Link>
              <Link className="rounded-full bg-[#8a5e76] px-4 py-2 text-white" href="/shop">
                Ava pood
              </Link>
            </div>
          </div>
        </header>

        <AdminQuickActions />

        {toast && (
          <div className="fixed right-4 top-6 z-50 rounded-xl border border-[#edd9e3] bg-white px-4 py-2 text-sm font-medium text-[#6a3b57] shadow-lg">
            {toast}
          </div>
        )}

        <section className="admin-surface-soft mb-6 rounded-3xl border border-[#e8e0d9] bg-[linear-gradient(165deg,#fff_0%,#fbf7f2_100%)] p-5 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.28)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#2f2230]">{draft.id ? 'Muuda toodet' : 'Lisa toode'}</h2>
              <p className="mt-1 text-sm text-[#7e6b75]">Loo toode samm-sammult, et sisu oleks kliendile selge ja usaldusväärne.</p>
            </div>
            {draft.id && (
              <p className="rounded-full border border-[#ecdce6] bg-white px-3 py-1 text-xs text-[#7e6b75]">
                Viimati uuendatud:{' '}
                {products.find((item) => item.id === draft.id)?.updatedAt
                  ? new Date(products.find((item) => item.id === draft.id)!.updatedAt).toLocaleString('et-EE')
                  : '—'}
              </p>
            )}
          </div>

          <div className="mt-5 space-y-6">
            <section className="rounded-2xl border border-[#eee3dc] bg-white/90 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7f6670]">Põhiinfo</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-[#4f3f46]">
                  Toote nimi
                  <input
                    value={draft.name}
                    onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Nt Rose Cuticle Oil"
                    className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 text-[#2f2230] outline-none focus:border-[#8a5e76]"
                  />
                </label>
                <label className="text-sm font-medium text-[#4f3f46]">
                  Hind (EUR)
                  <input
                    type="number"
                    value={draft.price}
                    onChange={(event) => setDraft((prev) => ({ ...prev, price: Number(event.target.value) }))}
                    placeholder="19"
                    className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 text-[#2f2230] outline-none focus:border-[#8a5e76]"
                  />
                </label>
                <label className="text-sm font-medium text-[#4f3f46] md:col-span-2">
                  Kirjeldus
                  <textarea
                    value={draft.description}
                    onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Luhike, usaldust tekitav tootekirjeldus."
                    className="mt-1 min-h-24 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 text-[#2f2230] outline-none focus:border-[#8a5e76]"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-[#eee3dc] bg-white/90 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7f6670]">Laoseis ja nähtavus</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-[#4f3f46]">
                  Laoseis
                  <input
                    type="number"
                    value={draft.stock}
                    onChange={(event) => setDraft((prev) => ({ ...prev, stock: Number(event.target.value) }))}
                    placeholder="20"
                    className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 text-[#2f2230] outline-none focus:border-[#8a5e76]"
                  />
                </label>
                <label className="text-sm font-medium text-[#4f3f46]">
                  Kategooria
                  <input
                    value={draft.category}
                    onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="Aftercare"
                    className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 text-[#2f2230] outline-none focus:border-[#8a5e76]"
                  />
                </label>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[#f0e3ea] bg-[#fff8fc] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[#4f3f46]">Nahtavus</p>
                  <p className="text-xs text-[#7e6b75]">Mitteaktiivne toode ei ole poes avalikult näha.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, active: !prev.active }))}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    draft.active ? 'bg-[#8a5e76] text-white' : 'bg-[#f0e4ea] text-[#7b6671]'
                  }`}
                >
                  {draft.active ? 'Aktiivne' : 'Peidetud'}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-[#eee3dc] bg-white/90 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7f6670]">Pildid</h3>
              <div className="mt-4 space-y-4">
                <label className="text-sm font-medium text-[#4f3f46]">
                  Pildi URL (optional)
                  <input
                    value={draft.imageUrl}
                    onChange={(event) => {
                      const value = event.target.value.trim();
                      setDraft((prev) => {
                        const imagesWithout = prev.images.filter((image) => image !== value);
                        return {
                          ...prev,
                          imageUrl: value,
                          images: value ? [value, ...imagesWithout] : prev.images,
                        };
                      });
                    }}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 text-[#2f2230] outline-none focus:border-[#8a5e76]"
                  />
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => void onUploadFiles(event.target.files)}
                  className="hidden"
                />

                {draft.images.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-2xl border-2 border-dashed border-[#ead8e2] bg-[#fffafd] px-4 py-8 text-center transition hover:border-[#c892af]"
                  >
                    <p className="text-sm font-semibold text-[#5f4753]">Lisa tootepilt</p>
                    <p className="mt-1 text-xs text-[#8b7782]">Pilt aitab toodet paremini müüa</p>
                  </button>
                ) : (
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-full border border-[#ead8e2] bg-white px-3 py-1 text-xs font-medium text-[#6f5d53] hover:bg-[#fff7fc]"
                      >
                        {isUploadingImages ? 'Laen pilte...' : 'Lisa veel pilte'}
                      </button>
                      <p className="text-xs text-[#8b7782]">Esimene pilt on vaikimisi esiletoodud.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {draft.images.map((image, index) => (
                        <div
                          key={`${image}-${index}`}
                          className="group relative overflow-hidden rounded-xl border border-[#eddde5] bg-white shadow-[0_16px_24px_-22px_rgba(84,51,72,0.65)]"
                        >
                          <div className="relative aspect-square">
                            <Image
                              src={image}
                              alt={`Tootepilt ${index + 1}`}
                              fill
                              unoptimized
                              className="object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-[#20141f]/55 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => setFeaturedImage(image)}
                              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                draft.imageUrl === image ? 'bg-[#8a5e76] text-white' : 'bg-white/90 text-[#5f4753]'
                              }`}
                            >
                              {draft.imageUrl === image ? 'Esiletoodud' : 'Märgi esiletooduks'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="h-7 w-7 rounded-full bg-white/90 text-sm font-bold text-[#8f3f64]"
                              aria-label="Kustuta pilt"
                            >
                              ×
                            </button>
                          </div>
                          <div className="absolute right-2 top-2 flex gap-1">
                            <button
                              type="button"
                              onClick={() => moveImage(index, 'left')}
                              className="h-7 w-7 rounded-full bg-white/90 text-xs text-[#5f4753]"
                              aria-label="Liiguta vasakule"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              onClick={() => moveImage(index, 'right')}
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
              </div>
            </section>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSave}
              disabled={!draft.name || isSaving}
              className="rounded-full bg-[#8a5e76] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#754d64] disabled:opacity-50"
            >
              {isSaving ? 'Salvestan...' : 'Salvesta toode'}
            </button>
            {draft.id && (
              <button
                type="button"
                onClick={() => setDraft(emptyProduct)}
                className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-sm text-[#6f5d53]"
              >
                Loo uus toode
              </button>
            )}
            <p className="text-xs text-[#8b7782]">Designed for easy booking and product management.</p>
          </div>
        </section>

        <section className="admin-surface rounded-3xl border border-[#ece3db] bg-white/95 p-4 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.35)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#2f2230]">Toodete nimekiri</h2>
            <p className="text-xs text-[#8b7782]">{products.length} toodet</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.id}
                className={`rounded-2xl border bg-white p-3 shadow-[0_14px_24px_-20px_rgba(80,50,66,0.45)] transition ${
                  highlightedProductId === product.id
                    ? 'border-[#c78aa8] ring-2 ring-[#ecd3df]'
                    : 'border-[#f0e3ea]'
                }`}
              >
                <div className="mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-[#f7ecf2]">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={640}
                      height={480}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#8b7782]">Nailify</div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#9a7788]">{product.category || 'Üldine'}</p>
                  <h3 className="text-base font-semibold text-[#2f2230]">{product.name}</h3>
                  <p className="line-clamp-2 text-sm text-[#7e6b75]">{product.description}</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#8a5e76]">EUR {product.price}</span>
                  <span className="text-[#7e6b75]">Laos: {product.stock}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      product.active ? 'bg-[#f0e3ea] text-[#744f66]' : 'bg-[#ececec] text-[#6d6d6d]'
                    }`}
                  >
                    {product.active ? 'Aktiivne' : 'Peidetud'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDraft(toDraft(product))}
                      className="rounded-full border border-[#ead8e2] px-3 py-1 text-xs text-[#6f5d53] hover:bg-[#fff8fc]"
                    >
                      Muuda
                    </button>
                    <button
                      onClick={() => void handleDelete(product.id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Kustuta
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
