'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Search, ChevronDown, ChevronRight, Package, Sparkles } from 'lucide-react';

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
  sortOrder?: number;
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
  sortOrder: number;
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
  sortOrder: 0,
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
    sortOrder: product.sortOrder ?? 0,
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'nameDesc' | 'price' | 'priceDesc' | 'newest'>('name');
  const [helpCollapsed, setHelpCollapsed] = useState(true);
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.categoryEt ?? p.category ?? ''));
    return Array.from(set).filter(Boolean).sort();
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    let list = products;
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (p) =>
          (p.nameEt ?? p.name ?? '').toLowerCase().includes(q) ||
          (p.nameEn ?? '').toLowerCase().includes(q) ||
          (p.categoryEt ?? p.category ?? '').toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'all') {
      list = list.filter((p) => (p.categoryEt ?? p.category) === categoryFilter);
    }
    if (activeFilter === 'active') list = list.filter((p) => p.active);
    if (activeFilter === 'inactive') list = list.filter((p) => !p.active);
    if (sortBy === 'name') list = [...list].sort((a, b) => (a.nameEt ?? a.name ?? '').localeCompare(b.nameEt ?? b.name ?? ''));
    if (sortBy === 'nameDesc') list = [...list].sort((a, b) => (b.nameEt ?? b.name ?? '').localeCompare(a.nameEt ?? a.name ?? ''));
    if (sortBy === 'price') list = [...list].sort((a, b) => a.price - b.price);
    if (sortBy === 'priceDesc') list = [...list].sort((a, b) => b.price - a.price);
    if (sortBy === 'newest') list = [...list].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    return list;
  }, [products, searchQuery, categoryFilter, activeFilter, sortBy]);

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
          sortOrder: draft.sortOrder,
        }),
      });
      if (!response.ok) throw new Error('Salvestamine ebaonnestus');
      await loadProducts();
      setIsDrawerOpen(false);
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

  const openNewProduct = () => {
    setDraft(emptyDraft);
    setIsDrawerOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setDraft(toDraft(product));
    setIsDrawerOpen(true);
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AdminPageHeader
          overline="Sisu"
          title="Tooted"
          subtitle="Poe tooted ja laoseis. Otsi, filtreeri või lisa uus toode."
          backHref="/admin"
          backLabel="Halduspaneel"
          primaryAction={{ label: 'Lisa toode', onClick: openNewProduct }}
          secondaryLinks={[
            { label: 'Teenused', href: '/admin/services' },
            { label: 'Ava pood', href: '/shop' },
          ]}
        />

        {/* Horizontal context: search + filters */}
        <section className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Otsi toote nime või kategooria järgi..."
              className="w-full rounded-xl border border-[#e5e7eb] bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 min-w-[140px]"
            >
              <option value="all">Kõik kategooriad</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 min-w-[120px]"
            >
              <option value="all">Kõik</option>
              <option value="active">Aktiivsed</option>
              <option value="inactive">Peidetud</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-800 min-w-[160px]"
            >
              <option value="name">Nimi A–Ü</option>
              <option value="nameDesc">Nimi Ü–A</option>
              <option value="price">Hind kasvav</option>
              <option value="priceDesc">Hind kahanev</option>
              <option value="newest">Uusimad esimesena</option>
            </select>
            <button
              type="button"
              onClick={() => setHelpCollapsed(!helpCollapsed)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {helpCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Abi
            </button>
          </div>
          {!helpCollapsed && (
            <div className="mt-3 rounded-xl border border-[#e5e7eb] bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-800 mb-1">Kuidas tooteid hallata</p>
              <ol className="list-decimal space-y-0.5 pl-4"> <li>Sisesta toote nimi, hind ja kirjeldus.</li><li>Lisa pilt ja laoseis.</li><li>Vajuta „Salvesta toode”.</li></ol>
            </div>
          )}
        </section>

        {toast && (
          <div className="fixed right-6 top-6 z-[70] rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-lg">
            {toast}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm text-red-800">{error}</div>
        )}

        {/* Main content card: product list */}
        <section className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Toodete nimekiri</h2>
            <p className="text-sm text-slate-500">
              {filteredAndSortedProducts.length} toodet
              {(searchQuery || categoryFilter !== 'all' || activeFilter !== 'all') && ' (filtreeritud)'}
            </p>
          </div>

          {filteredAndSortedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Package className="h-7 w-7" />
              </div>
              <p className="mt-4 text-sm text-slate-500">Tooteid ei leitud.</p>
              <p className="mt-1 text-xs text-slate-400">Lisa toode või muuda filtreid.</p>
              <button type="button" onClick={openNewProduct} className="mt-5 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-900">
                Lisa toode
              </button>
            </div>
          ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredAndSortedProducts.map((product) => (
              <article
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.nameEt ?? product.name}
                      width={640}
                      height={480}
                      unoptimized
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <Package className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2 flex flex-col gap-1">
                    {!product.active && (
                      <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-white">
                        Peidetud
                      </span>
                    )}
                    {product.isFeatured && (
                      <span className="rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
                        Soovitatud
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    {product.categoryEt ?? product.category}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-800">{product.nameEt ?? product.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">
                    {product.descriptionEt ?? product.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-lg font-semibold text-slate-800">EUR {product.price}</span>
                      <span className="ml-2 text-xs text-slate-500">Laos: {product.stock}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditProduct(product)}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Muuda
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteProduct(product.id, product.nameEt ?? product.name)}
                        className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Kustuta
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          )}
        </section>
      </div>

      {/* Editor drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-[#e5e7eb] bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">{draft.id ? 'Muuda toodet' : 'Lisa toode'}</h2>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Sulge
              </button>
            </div>

            <div className="space-y-6 p-6">
              <p className="text-xs text-[#6b7280]">Eesti keel (/et) · English (/en)</p>

              {/* Basic info */}
              <fieldset className="rounded-2xl border border-[#e5e7eb] bg-white p-5">
                <legend className="px-2 text-sm font-semibold text-slate-800">Põhiandmed (eesti)</legend>
                <div className="mt-3 space-y-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-slate-600">Toote nimi</span>
                    <input
                      value={draft.nameEt}
                      onChange={(e) => setDraft((p) => ({ ...p, nameEt: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-[#4f3f46]">Kirjeldus</span>
                    <textarea
                      value={draft.descriptionEt}
                      onChange={(e) => setDraft((p) => ({ ...p, descriptionEt: e.target.value }))}
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-[#e5e0e3] bg-[#faf8f9] px-3 py-2.5 text-sm focus:border-[#c24d86] focus:outline-none focus:ring-1 focus:ring-[#c24d86]/20"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-[#4f3f46]">Kategooria</span>
                    <input
                      value={draft.categoryEt}
                      onChange={(e) => setDraft((p) => ({ ...p, categoryEt: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-[#e5e0e3] bg-[#faf8f9] px-3 py-2.5 text-sm focus:border-[#c24d86] focus:outline-none focus:ring-1 focus:ring-[#c24d86]/20"
                    />
                  </label>
                </div>
              </fieldset>

              {/* English version */}
              <fieldset className="rounded-2xl border border-[#efe4eb] bg-white p-5">
                <legend className="px-2 text-sm font-semibold text-[#374151]">English version</legend>
                <div className="mt-3 space-y-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-[#4f3f46]">Product name</span>
                    <div className="mt-1 flex gap-2">
                      <input
                        value={draft.nameEn}
                        onChange={(e) => setDraft((p) => ({ ...p, nameEn: e.target.value }))}
                        className="flex-1 rounded-xl border border-[#e5e0e3] bg-[#faf8f9] px-3 py-2.5 text-sm focus:border-[#c24d86] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void generateEnglishSuggestion(draft.nameEt, 'nameEn')}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#e5e0e3] bg-white px-2.5 py-2 text-xs font-medium text-[#6b7280] hover:bg-[#fdf8fb]"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> EN
                      </button>
                    </div>
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-[#4f3f46]">Description</span>
                    <div className="mt-1 flex gap-2">
                      <textarea
                        value={draft.descriptionEn}
                        onChange={(e) => setDraft((p) => ({ ...p, descriptionEn: e.target.value }))}
                        rows={3}
                        className="flex-1 rounded-xl border border-[#e5e0e3] bg-[#faf8f9] px-3 py-2.5 text-sm focus:border-[#c24d86] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void generateEnglishSuggestion(draft.descriptionEt, 'descriptionEn')}
                        className="h-fit rounded-lg border border-[#e5e0e3] bg-white px-2.5 py-2 text-xs font-medium text-[#6b7280] hover:bg-[#fdf8fb]"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> EN
                      </button>
                    </div>
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-[#4f3f46]">Category</span>
                    <div className="mt-1 flex gap-2">
                      <input
                        value={draft.categoryEn}
                        onChange={(e) => setDraft((p) => ({ ...p, categoryEn: e.target.value }))}
                        className="flex-1 rounded-xl border border-[#e5e0e3] bg-[#faf8f9] px-3 py-2.5 text-sm focus:border-[#c24d86] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void generateEnglishSuggestion(draft.categoryEt, 'categoryEn')}
                        className="rounded-lg border border-[#e5e0e3] bg-white px-2.5 py-2 text-xs font-medium text-[#6b7280] hover:bg-[#fdf8fb]"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> EN
                      </button>
                    </div>
                  </label>
                </div>
              </fieldset>

              {/* Commerce / inventory */}
              <fieldset className="rounded-2xl border border-[#efe4eb] bg-white p-5">
                <legend className="px-2 text-sm font-semibold text-[#374151]">Hind ja laoseis</legend>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="block text-sm font-medium text-[#4f3f46]">Hind (EUR)</span>
                    <input
                      type="number"
                      value={draft.price}
                      onChange={(e) => setDraft((p) => ({ ...p, price: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-[#e5e0e3] bg-[#faf8f9] px-3 py-2.5 text-sm focus:border-[#c24d86] focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-[#4f3f46]">Laoseis</span>
                    <input
                      type="number"
                      value={draft.stock}
                      onChange={(e) => setDraft((p) => ({ ...p, stock: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-[#e5e0e3] bg-[#faf8f9] px-3 py-2.5 text-sm focus:border-[#c24d86] focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-[#4f3f46]">Järjekord</span>
                    <input
                      type="number"
                      value={draft.sortOrder}
                      onChange={(e) => setDraft((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-[#e5e0e3] bg-[#faf8f9] px-3 py-2.5 text-sm focus:border-[#c24d86] focus:outline-none"
                    />
                  </label>
                </div>
              </fieldset>

              {/* Media */}
              <fieldset className="rounded-2xl border border-[#efe4eb] bg-white p-5">
                <legend className="px-2 text-sm font-semibold text-[#374151]">Pilt</legend>
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="block text-sm font-medium text-[#4f3f46]">Pildi URL</span>
                    <input
                      value={draft.imageUrl}
                      onChange={(e) => setDraft((p) => ({ ...p, imageUrl: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-[#e5e0e3] bg-[#faf8f9] px-3 py-2.5 text-sm focus:border-[#c24d86] focus:outline-none"
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const image = String(reader.result ?? '');
                          setDraft((prev) => ({
                            ...prev,
                            imageUrl: image,
                            images: [image, ...prev.images.filter((img) => img !== image)],
                          }));
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border border-[#e5e0e3] bg-white px-4 py-2 text-sm font-medium text-[#4b5563] hover:bg-[#fdf8fb]"
                    >
                      Laadi pilt üles
                    </button>
                  </div>
                </div>
              </fieldset>

              {/* Visibility */}
              <fieldset className="rounded-2xl border border-[#efe4eb] bg-white p-5">
                <legend className="px-2 text-sm font-semibold text-[#374151]">Nähtavus</legend>
                <div className="mt-3 flex flex-wrap gap-6">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(e) => setDraft((p) => ({ ...p, active: e.target.checked }))}
                      className="h-4 w-4 rounded border-[#d1d5db] text-[#c24d86] focus:ring-[#c24d86]/30"
                    />
                    <span className="text-sm font-medium text-[#374151]">Aktiivne (nähtav poes)</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={draft.isFeatured}
                      onChange={(e) => setDraft((p) => ({ ...p, isFeatured: e.target.checked }))}
                      className="h-4 w-4 rounded border-[#d1d5db] text-[#c24d86] focus:ring-[#c24d86]/30"
                    />
                    <span className="text-sm font-medium text-[#374151]">Esile toodud</span>
                  </label>
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center gap-3 border-t border-[#e5e7eb] pt-5">
                <button
                  type="button"
                  onClick={() => void saveProduct()}
                  disabled={!draft.nameEt.trim() || isSaving}
                  className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  {isSaving ? 'Salvestan...' : 'Salvesta toode'}
                </button>
                <button
                  type="button"
                  onClick={() => { setDraft(emptyDraft); }}
                  className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Tühjenda
                </button>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Sulge
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
