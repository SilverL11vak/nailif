'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';

interface Product {
  id: string;
  name: string;
  nameEt?: string;
  nameEn?: string;
  description: string;
  descriptionEt?: string;
  descriptionEn?: string;
  price: number;
  imageUrl: string | null;
  images: string[];
  category: string;
  categoryEt?: string;
  categoryEn?: string;
  stock: number;
  active: boolean;
  isFeatured: boolean;
  updatedAt: string;
}

interface ProductDraft {
  id: string;
  nameEt: string;
  nameEn: string;
  descriptionEt: string;
  descriptionEn: string;
  price: number;
  imageUrl: string;
  images: string[];
  categoryEt: string;
  categoryEn: string;
  stock: number;
  active: boolean;
  isFeatured: boolean;
}

const emptyDraft: ProductDraft = {
  id: '',
  nameEt: '',
  nameEn: '',
  descriptionEt: '',
  descriptionEn: '',
  price: 19,
  imageUrl: '',
  images: [],
  categoryEt: 'Hooldus',
  categoryEn: 'Aftercare',
  stock: 20,
  active: true,
  isFeatured: false,
};

function toDraft(product: Product): ProductDraft {
  return {
    id: product.id,
    nameEt: product.nameEt ?? product.name ?? '',
    nameEn: product.nameEn ?? '',
    descriptionEt: product.descriptionEt ?? product.description ?? '',
    descriptionEn: product.descriptionEn ?? '',
    price: product.price,
    imageUrl: product.imageUrl ?? '',
    images: product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [],
    categoryEt: product.categoryEt ?? product.category ?? 'Hooldus',
    categoryEn: product.categoryEn ?? '',
    stock: product.stock,
    active: product.active,
    isFeatured: product.isFeatured ?? false,
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProducts = async () => {
    const response = await fetch('/api/products?admin=1', { cache: 'no-store' });
    if (!response.ok) throw new Error('Tooteid ei saanud laadida');
    const data = (await response.json()) as { products?: Product[] };
    setProducts(data.products ?? []);
  };

  useEffect(() => {
    void loadProducts().catch(() => setError('Toodete laadimine ebaonnestus.'));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const generateEnglishSuggestion = async (source: string, field: 'nameEn' | 'descriptionEn' | 'categoryEn') => {
    if (!source.trim()) return;
    const response = await fetch('/api/admin/translate-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: source }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { suggestion?: string };
    if (data.suggestion) {
      setDraft((prev) => ({ ...prev, [field]: prev[field].trim() ? prev[field] : data.suggestion ?? '' }));
    }
  };

  const saveProduct = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id || undefined,
          nameEt: draft.nameEt,
          nameEn: draft.nameEn,
          descriptionEt: draft.descriptionEt,
          descriptionEn: draft.descriptionEn,
          price: draft.price,
          imageUrl: draft.images[0] ?? draft.imageUrl ?? null,
          images: draft.images,
          categoryEt: draft.categoryEt,
          categoryEn: draft.categoryEn,
          stock: draft.stock,
          active: draft.active,
          isFeatured: draft.isFeatured,
        }),
      });
      if (!response.ok) throw new Error('Salvestamine ebaonnestus');
      await loadProducts();
      setDraft(emptyDraft);
      setToast('Toode salvestatud');
    } catch {
      setError('Toote salvestamine ebaonnestus.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (id: string, productName: string) => {
    const isConfirmed = window.confirm(`Kas kustutada toode "${productName}"? Seda tegevust ei saa tagasi votta.`);
    if (!isConfirmed) return;

    try {
      const response = await fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Kustutamine ebaonnestus');
      await loadProducts();
      setToast('Toode kustutatud');
    } catch {
      setError('Toote kustutamine ebaonnestus.');
    }
  };

  return (
    <main className="admin-cockpit-bg px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="admin-cockpit-shell mb-6 rounded-[28px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6b7280]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#111827]">Tooted</h1>
            </div>
            <div className="flex gap-2 text-sm">
              <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[#4b5563]" href="/admin">Halduspaneel</Link>
              <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[#4b5563]" href="/admin/services">Teenused</Link>
              <Link className="rounded-full bg-[#111827] px-4 py-2 text-white" href="/shop">Ava pood</Link>
            </div>
          </div>
        </header>

        <AdminQuickActions />

        <section className="admin-surface-soft mb-6 rounded-3xl p-4">
          <h2 className="text-lg font-semibold text-[#111827]">Kuidas tooteid hallata</h2>
          <div className="mt-2 grid gap-2 text-sm text-[#4b5563] md:grid-cols-3">
            <p className="rounded-xl bg-white px-3 py-2">1. Sisesta toote nimi, hind ja kirjeldus.</p>
            <p className="rounded-xl bg-white px-3 py-2">2. Lisa pilt ja laoseis.</p>
            <p className="rounded-xl bg-white px-3 py-2">3. Vajuta &quot;Salvesta toode&quot;.</p>
          </div>
        </section>

        {toast && <div className="fixed right-4 top-6 z-[70] rounded-xl border border-[#edd9e3] bg-white px-4 py-2 text-sm font-medium text-[#6a3b57] shadow-lg">{toast}</div>}
        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="admin-surface-soft mb-6 rounded-3xl p-5">
          <div className="mb-3 grid gap-2 text-xs text-[#7f6670] md:grid-cols-2">
            <p>Eesti tekst kuvatakse /et lehel.</p>
            <p>Inglise tekst kuvatakse /en lehel.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.14em] text-[#7f6670]">Eesti keel</p>
              <label className="block text-sm font-medium text-[#4f3f46]">Toote nimi
                <input value={draft.nameEt} onChange={(e) => setDraft((p) => ({ ...p, nameEt: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
              </label>
              <label className="mt-3 block text-sm font-medium text-[#4f3f46]">Kirjeldus
                <textarea value={draft.descriptionEt} onChange={(e) => setDraft((p) => ({ ...p, descriptionEt: e.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
              </label>
              <label className="mt-3 block text-sm font-medium text-[#4f3f46]">Kategooria
                <input value={draft.categoryEt} onChange={(e) => setDraft((p) => ({ ...p, categoryEt: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
              </label>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.14em] text-[#7f6670]">English version</p>
              <label className="block text-sm font-medium text-[#4f3f46]">Product name
                <div className="mt-1 flex gap-2">
                  <input value={draft.nameEn} onChange={(e) => setDraft((p) => ({ ...p, nameEn: e.target.value }))} className="w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                  <button type="button" onClick={() => void generateEnglishSuggestion(draft.nameEt, 'nameEn')} className="rounded-xl border border-[#e5ddd3] px-2 py-1 text-xs text-[#4b5563]">Generate English suggestion</button>
                </div>
              </label>
              <label className="mt-3 block text-sm font-medium text-[#4f3f46]">Description
                <div className="mt-1 flex gap-2">
                  <textarea value={draft.descriptionEn} onChange={(e) => setDraft((p) => ({ ...p, descriptionEn: e.target.value }))} className="min-h-24 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                  <button type="button" onClick={() => void generateEnglishSuggestion(draft.descriptionEt, 'descriptionEn')} className="h-fit rounded-xl border border-[#e5ddd3] px-2 py-1 text-xs text-[#4b5563]">Generate English suggestion</button>
                </div>
              </label>
              <label className="mt-3 block text-sm font-medium text-[#4f3f46]">Category
                <div className="mt-1 flex gap-2">
                  <input value={draft.categoryEn} onChange={(e) => setDraft((p) => ({ ...p, categoryEn: e.target.value }))} className="w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
                  <button type="button" onClick={() => void generateEnglishSuggestion(draft.categoryEt, 'categoryEn')} className="rounded-xl border border-[#e5ddd3] px-2 py-1 text-xs text-[#4b5563]">Generate English suggestion</button>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <label className="text-sm font-medium text-[#4f3f46]">Hind (EUR)
              <input type="number" value={draft.price} onChange={(e) => setDraft((p) => ({ ...p, price: Number(e.target.value) }))} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
            </label>
            <label className="text-sm font-medium text-[#4f3f46]">Laoseis
              <input type="number" value={draft.stock} onChange={(e) => setDraft((p) => ({ ...p, stock: Number(e.target.value) }))} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
            </label>
            <label className="text-sm font-medium text-[#4f3f46]">Pildi URL
              <input value={draft.imageUrl} onChange={(e) => setDraft((p) => ({ ...p, imageUrl: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none focus:border-[#9ca3af]" />
            </label>
            <div className="flex items-end gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const image = String(reader.result ?? '');
                  setDraft((prev) => ({ ...prev, imageUrl: image, images: [image, ...prev.images.filter((img) => img !== image)] }));
                };
                reader.readAsDataURL(file);
              }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 text-xs text-[#4b5563]">Upload image</button>
              <label className="flex items-center gap-2 text-sm text-[#5f4f5f]"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft((p) => ({ ...p, active: e.target.checked }))} /> Aktiivne</label>
              <label className="flex items-center gap-2 text-sm text-[#5f4f5f]"><input type="checkbox" checked={draft.isFeatured} onChange={(e) => setDraft((p) => ({ ...p, isFeatured: e.target.checked }))} /> Esile toodud</label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button onClick={() => void saveProduct()} disabled={!draft.nameEt || isSaving} className="rounded-full bg-[#111827] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {isSaving ? 'Salvestan...' : 'Salvesta toode'}
            </button>
            <button type="button" onClick={() => setDraft(emptyDraft)} className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-sm text-[#4b5563]">Uus toode</button>
          </div>
        </section>

        <section className="admin-surface rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#111827]">Toodete nimekiri</h2>
            <p className="text-xs text-[#6b7280]">{products.length} toodet</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="rounded-2xl border border-[#f0e3ea] bg-white p-3 shadow-[0_14px_24px_-20px_rgba(80,50,66,0.45)]">
                <div className="mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-[#f7ecf2]">
                  {product.imageUrl ? <Image src={product.imageUrl} alt={product.nameEt ?? product.name} width={640} height={480} unoptimized className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-[#6b7280]">Nailify</div>}
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#9a7788]">{product.categoryEt ?? product.category}</p>
                  <h3 className="text-base font-semibold text-[#111827]">{product.nameEt ?? product.name}</h3>
                  <p className="line-clamp-2 text-sm text-[#7e6b75]">{product.descriptionEt ?? product.description}</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#374151]">EUR {product.price}</span>
                  <span className="text-[#7e6b75]">Laos: {product.stock}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${product.active ? 'bg-[#f0e3ea] text-[#744f66]' : 'bg-[#ececec] text-[#6d6d6d]'}`}>{product.active ? 'Aktiivne' : 'Peidetud'}</span>
                    {product.isFeatured ? <span className="rounded-full bg-[#ffeaf5] px-2 py-1 text-[11px] font-semibold text-[#8f4f72]">Soovitatud</span> : null}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setDraft(toDraft(product))} className="rounded-full border border-[#d1d5db] px-3 py-1 text-xs text-[#4b5563] hover:bg-[#fff8fc]">Muuda</button>
                    <button onClick={() => void deleteProduct(product.id, product.nameEt ?? product.name)} className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">Kustuta</button>
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
