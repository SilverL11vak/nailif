'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import type { Service, ServiceVariant } from '@/store/booking-types';

interface AdminService extends Service {
  active?: boolean;
  sortOrder?: number;
  imageUrl?: string | null;
  nameEt?: string;
  nameEn?: string;
  descriptionEt?: string;
  descriptionEn?: string;
}

interface ServiceCategory {
  id: string;
  name: string;
  nameEt?: string;
  nameEn?: string;
  sortOrder?: number;
  active?: boolean;
}

interface ServiceDraft {
  id: string;
  nameEt: string;
  nameEn: string;
  descriptionEt: string;
  descriptionEn: string;
  duration: number;
  price: number;
  categoryId: string;
  categoryNameEt: string;
  imageUrl: string;
  allowAddOns: boolean;
  active: boolean;
  sortOrder: number;
}

interface CategoryDraft {
  id: string;
  nameEt: string;
  nameEn: string;
  sortOrder: number;
  active: boolean;
}

interface VariantDraft {
  id: string;
  serviceId: string;
  nameEt: string;
  nameEn: string;
  price: number;
  duration: number;
  isActive: boolean;
  orderIndex: number;
}

interface AddOnEntry {
  id: string;
  serviceId?: string | null;
  nameEt: string;
  nameEn: string;
  descriptionEt: string;
  descriptionEn: string;
  duration: number;
  price: number;
  sortOrder: number;
  active: boolean;
}

const emptyServiceDraft: ServiceDraft = {
  id: '',
  nameEt: '',
  nameEn: '',
  descriptionEt: '',
  descriptionEn: '',
  duration: 60,
  price: 40,
  categoryId: '',
  categoryNameEt: '',
  imageUrl: '',
  allowAddOns: true,
  active: true,
  sortOrder: 0,
};

const emptyCategoryDraft: CategoryDraft = {
  id: '',
  nameEt: '',
  nameEn: '',
  sortOrder: 0,
  active: true,
};

const emptyVariantDraft: VariantDraft = {
  id: '',
  serviceId: '',
  nameEt: '',
  nameEn: '',
  price: 0,
  duration: 45,
  isActive: true,
  orderIndex: 0,
};

const emptyAddOnDraft: AddOnEntry = {
  id: '',
  serviceId: null,
  nameEt: '',
  nameEn: '',
  descriptionEt: '',
  descriptionEn: '',
  duration: 15,
  price: 0,
  sortOrder: 0,
  active: true,
};

function toServiceDraft(service: AdminService): ServiceDraft {
  return {
    id: service.id,
    nameEt: service.nameEt ?? service.name ?? '',
    nameEn: service.nameEn ?? '',
    descriptionEt: service.descriptionEt ?? service.description ?? '',
    descriptionEn: service.descriptionEn ?? '',
    duration: service.duration,
    price: service.price,
    categoryId: service.categoryId ?? '',
    categoryNameEt: service.categoryNameEt ?? service.category ?? '',
    imageUrl: service.imageUrl ?? '',
    allowAddOns: service.allowAddOns !== false,
    active: service.active !== false,
    sortOrder: service.sortOrder ?? 0,
  };
}

function toCategoryDraft(category: ServiceCategory): CategoryDraft {
  return {
    id: category.id,
    nameEt: category.nameEt ?? category.name ?? '',
    nameEn: category.nameEn ?? '',
    sortOrder: category.sortOrder ?? 0,
    active: category.active !== false,
  };
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function AdminServicesPage() {
  const [editorLanguage, setEditorLanguage] = useState<'et' | 'en'>('et');
  const [services, setServices] = useState<AdminService[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [serviceAddOns, setServiceAddOns] = useState<AddOnEntry[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(emptyServiceDraft);
  const [serviceEditorOpen, setServiceEditorOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(emptyCategoryDraft);
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const [variantDraft, setVariantDraft] = useState<VariantDraft>(emptyVariantDraft);
  const [variantEditorOpen, setVariantEditorOpen] = useState(false);
  const [addOnDraft, setAddOnDraft] = useState<AddOnEntry>(emptyAddOnDraft);
  const [addOnEditorOpen, setAddOnEditorOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const serviceImageUploadRef = useRef<HTMLInputElement | null>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories]
  );

  const servicesInCategory = useMemo(
    () =>
      services
        .filter((service) => (selectedCategoryId ? service.categoryId === selectedCategoryId : true))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [selectedCategoryId, services]
  );

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [selectedServiceId, services]
  );

  const selectedServiceVariants = useMemo(
    () => [...(selectedService?.variants ?? [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [selectedService?.variants]
  );

  const loadAll = async () => {
    const servicesResponse = await fetch('/api/services?admin=1', { cache: 'no-store' });

    if (!servicesResponse.ok) throw new Error('Teenuseid ei saanud laadida');

    const servicesData = (await servicesResponse.json()) as { services?: AdminService[]; categories?: ServiceCategory[] };

    setCategories(Array.isArray(servicesData.categories) ? servicesData.categories : []);
    setServices(Array.isArray(servicesData.services) ? servicesData.services : []);
  };

  const loadServiceAddOns = async (serviceId: string) => {
    const response = await fetch(`/api/booking-addons?admin=1&serviceId=${encodeURIComponent(serviceId)}`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Lisateenuseid ei saanud laadida');
    const data = (await response.json()) as { addOns?: AddOnEntry[] };
    setServiceAddOns(Array.isArray(data.addOns) ? data.addOns : []);
  };

  useEffect(() => {
    void loadAll().catch(() => setError('Teenuste laadimine ebaonnestus.'));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!selectedCategoryId && sortedCategories.length > 0) {
      setSelectedCategoryId(sortedCategories[0].id);
    }
  }, [selectedCategoryId, sortedCategories]);

  useEffect(() => {
    const firstService = servicesInCategory[0];
    if (!firstService) {
      setSelectedServiceId('');
      return;
    }
    if (!selectedServiceId || !servicesInCategory.some((service) => service.id === selectedServiceId)) {
      setSelectedServiceId(firstService.id);
    }
  }, [selectedServiceId, servicesInCategory]);

  useEffect(() => {
    if (!selectedServiceId) {
      setServiceAddOns([]);
      setAddOnDraft(emptyAddOnDraft);
      return;
    }
    setAddOnDraft((prev) => ({ ...prev, serviceId: selectedServiceId }));
    void loadServiceAddOns(selectedServiceId).catch(() => setError('Lisateenuste laadimine ebaonnestus.'));
  }, [selectedServiceId]);

  const saveCategory = async () => {
    if (!categoryDraft.nameEt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/services/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: categoryDraft.id || undefined,
          nameEt: categoryDraft.nameEt.trim(),
          nameEn: categoryDraft.nameEn.trim(),
          sortOrder: categoryDraft.sortOrder,
          active: categoryDraft.active,
        }),
      });
      if (!response.ok) throw new Error('save failed');
      await loadAll();
      setCategoryEditorOpen(false);
      setCategoryDraft(emptyCategoryDraft);
      setToast('Kategooria salvestatud');
    } catch {
      setError('Kategooria salvestamine ebaonnestus.');
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = async (category: ServiceCategory) => {
    if (!window.confirm(`Kustutada kategooria "${category.name}"?`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/services/categories?id=${encodeURIComponent(category.id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        if (response.status === 409) {
          setError('Kategooriat ei saa kustutada, sest selles on teenuseid.');
          return;
        }
        throw new Error('delete failed');
      }
      await loadAll();
      setToast('Kategooria kustutatud');
    } catch {
      setError('Kategooria kustutamine ebaonnestus.');
    }
  };

  const reorderCategory = async (category: ServiceCategory, direction: 'up' | 'down') => {
    const list = sortedCategories;
    const index = list.findIndex((item) => item.id === category.id);
    const otherIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || otherIndex < 0 || otherIndex >= list.length) return;
    const reordered = [...list];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(otherIndex, 0, moved);

    await Promise.all(
      reordered.map((item, idx) =>
        fetch('/api/services/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            nameEt: item.nameEt ?? item.name,
            nameEn: item.nameEn ?? '',
            sortOrder: idx,
            active: item.active ?? true,
          }),
        })
      )
    );

    await loadAll();
  };

  const saveService = async () => {
    if (!serviceDraft.nameEt.trim() || !serviceDraft.categoryId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: serviceDraft.id || undefined,
          nameEt: serviceDraft.nameEt.trim(),
          nameEn: serviceDraft.nameEn.trim(),
          descriptionEt: serviceDraft.descriptionEt.trim(),
          descriptionEn: serviceDraft.descriptionEn.trim(),
          duration: serviceDraft.duration,
          price: serviceDraft.price,
          categoryId: serviceDraft.categoryId,
          category:
            serviceDraft.categoryNameEt ||
            categories.find((c) => c.id === serviceDraft.categoryId)?.nameEt ||
            categories.find((c) => c.id === serviceDraft.categoryId)?.name ||
            '',
          imageUrl: serviceDraft.imageUrl.trim() || null,
          allowAddOns: serviceDraft.allowAddOns,
          sortOrder: serviceDraft.sortOrder,
          active: serviceDraft.active,
        }),
      });
      if (!response.ok) throw new Error('save failed');
      await loadAll();
      setServiceEditorOpen(false);
      setServiceDraft(emptyServiceDraft);
      setToast('Teenus salvestatud');
    } catch {
      setError('Teenuse salvestamine ebaonnestus.');
    } finally {
      setBusy(false);
    }
  };

  const deleteService = async (service: AdminService) => {
    if (!window.confirm(`Kustutada teenus "${service.name}"?`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/services?id=${encodeURIComponent(service.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('delete failed');
      await loadAll();
      setToast('Teenus kustutatud');
    } catch {
      setError('Teenuse kustutamine ebaonnestus.');
    }
  };

  const reorderService = async (service: AdminService, direction: 'up' | 'down') => {
    const list = servicesInCategory;
    const index = list.findIndex((item) => item.id === service.id);
    const otherIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || otherIndex < 0 || otherIndex >= list.length) return;
    const reordered = [...list];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(otherIndex, 0, moved);

    const asPayload = (item: AdminService, sortOrder: number) => ({
      id: item.id,
      nameEt: item.nameEt ?? item.name,
      nameEn: item.nameEn ?? '',
      descriptionEt: item.descriptionEt ?? item.description ?? '',
      descriptionEn: item.descriptionEn ?? '',
      duration: item.duration,
      price: item.price,
      categoryId: item.categoryId,
      category: item.categoryNameEt ?? item.category,
      imageUrl: item.imageUrl ?? null,
      allowAddOns: item.allowAddOns !== false,
      sortOrder,
      active: item.active !== false,
    });

    await Promise.all(
      reordered.map((item, idx) =>
        fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(asPayload(item, idx)),
        })
      )
    );

    await loadAll();
  };

  const saveVariant = async () => {
    if (!variantDraft.serviceId || !variantDraft.nameEt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/services/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: variantDraft.id || undefined,
          serviceId: variantDraft.serviceId,
          name: variantDraft.nameEt.trim(),
          nameEt: variantDraft.nameEt.trim(),
          nameEn: variantDraft.nameEn.trim(),
          price: variantDraft.price,
          duration: variantDraft.duration,
          isActive: variantDraft.isActive,
          orderIndex: variantDraft.orderIndex,
        }),
      });
      if (!response.ok) throw new Error('save failed');
      await loadAll();
      setVariantEditorOpen(false);
      setVariantDraft(emptyVariantDraft);
      setToast('Teenuse valik salvestatud');
    } catch {
      setError('Variandi salvestamine ebaonnestus.');
    } finally {
      setBusy(false);
    }
  };

  const deleteVariant = async (variant: ServiceVariant) => {
    if (!window.confirm(`Kustutada valik "${variant.name}"?`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/services/variants?id=${encodeURIComponent(variant.id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('delete failed');
      await loadAll();
      setToast('Teenuse valik kustutatud');
    } catch {
      setError('Variandi kustutamine ebaonnestus.');
    }
  };

  const saveServiceAddOn = async () => {
    const resolvedServiceId = addOnDraft.serviceId ?? selectedServiceId ?? null;
    if (!addOnDraft.nameEt.trim() || !resolvedServiceId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/booking-addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: addOnDraft.id || undefined,
          serviceId: resolvedServiceId,
          nameEt: addOnDraft.nameEt.trim(),
          nameEn: addOnDraft.nameEn.trim(),
          descriptionEt: addOnDraft.descriptionEt.trim(),
          descriptionEn: addOnDraft.descriptionEn.trim(),
          duration: addOnDraft.duration,
          price: addOnDraft.price,
          sortOrder: addOnDraft.sortOrder,
          active: addOnDraft.active,
        }),
      });
      if (!response.ok) throw new Error('save failed');
      await loadServiceAddOns(resolvedServiceId);
      setAddOnEditorOpen(false);
      setAddOnDraft({ ...emptyAddOnDraft, serviceId: resolvedServiceId });
      setToast('Lisateenus salvestatud');
    } catch {
      setError('Lisateenuse salvestamine ebaonnestus.');
    } finally {
      setBusy(false);
    }
  };

  const handleServiceImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setError('Pildifail on liiga suur (max 5 MB).');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setServiceDraft((prev) => ({ ...prev, imageUrl: dataUrl }));
      setToast('Pilt lisatud');
      setError(null);
    } catch {
      setError('Pildi üleslaadimine ebaõnnestus.');
    } finally {
      if (serviceImageUploadRef.current) {
        serviceImageUploadRef.current.value = '';
      }
    }
  };

  const deleteServiceAddOn = async (addOn: AddOnEntry) => {
    if (!window.confirm(`Kustutada lisateenus "${addOn.nameEt}"?`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/booking-addons?id=${encodeURIComponent(addOn.id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('delete failed');
      if (selectedServiceId) {
        await loadServiceAddOns(selectedServiceId);
      }
      setToast('Lisateenus kustutatud');
    } catch {
      setError('Lisateenuse kustutamine ebaonnestus.');
    }
  };

  return (
    <main className="space-y-6">
      <div className="space-y-6">
        <AdminPageHeader
          overline="Broneering"
          title="Teenuste hierarhia"
          subtitle="Halda 3-tasandilist struktuuri: kategooria -> teenus -> valik (Hooldus/Paigaldus). Lisateenused on eraldi plokis."
          backHref="/admin"
          backLabel="Halduspaneel"
          primaryAction={{
            label: 'Uus teenus',
            onClick: () => {
              setServiceDraft({
                ...emptyServiceDraft,
                categoryId: selectedCategoryId,
                categoryNameEt:
                  categories.find((c) => c.id === selectedCategoryId)?.nameEt ??
                  categories.find((c) => c.id === selectedCategoryId)?.name ??
                  '',
                sortOrder: servicesInCategory.length,
              });
              setServiceEditorOpen(true);
            },
          }}
        />

        {toast ? <div className="mb-4 rounded-xl border border-[#e7d9e2] bg-white px-4 py-2 text-sm text-[#6b5b65]">{toast}</div> : null}
        {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}
        <div className="inline-flex rounded-full border border-[#e7d6e1] bg-white p-1">
          <button
            type="button"
            onClick={() => setEditorLanguage('et')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${editorLanguage === 'et' ? 'bg-[#fbeef5] text-[#7f375d]' : 'text-[#786674]'}`}
          >
            Eesti
          </button>
          <button
            type="button"
            onClick={() => setEditorLanguage('en')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${editorLanguage === 'en' ? 'bg-[#fbeef5] text-[#7f375d]' : 'text-[#786674]'}`}
          >
            Inglise
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-[#ece2e9] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8f7d88]">Kategooriad</h2>
              <button
                type="button"
                onClick={() => {
                  setCategoryDraft({ ...emptyCategoryDraft, sortOrder: sortedCategories.length });
                  setCategoryEditorOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-[#eadde5] px-3 py-1 text-xs text-[#6d5e67]"
              >
                <Plus className="h-3.5 w-3.5" /> Lisa
              </button>
            </div>

            <div className="space-y-2">
              {sortedCategories.map((category, index) => {
                const selected = category.id === selectedCategoryId;
                return (
                  <article key={category.id} className={`rounded-xl border p-3 ${selected ? 'border-[#d7b0c7] bg-[#fff7fb]' : 'border-[#efe7ec]'}`}>
                    <button type="button" onClick={() => setSelectedCategoryId(category.id)} className="w-full text-left">
                      <p className="text-sm font-semibold text-[#2e242b]">{category.name}</p>
                      <p className="mt-1 text-xs text-[#7a6a74]">{category.active === false ? 'Peidetud' : 'Aktiivne'}</p>
                    </button>
                    <div className="mt-3 flex items-center gap-1">
                      <button type="button" onClick={() => void reorderCategory(category, 'up')} disabled={index === 0} className="rounded-lg border border-[#eadde5] p-1.5 text-[#6e5e68] disabled:opacity-30" aria-label="Tosta ule"><ChevronUp className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => void reorderCategory(category, 'down')} disabled={index === sortedCategories.length - 1} className="rounded-lg border border-[#eadde5] p-1.5 text-[#6e5e68] disabled:opacity-30" aria-label="Tosta alla"><ChevronDown className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => { setCategoryDraft(toCategoryDraft(category)); setCategoryEditorOpen(true); }} className="ml-auto rounded-lg border border-[#eadde5] p-1.5 text-[#6e5e68]" aria-label="Muuda"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => void deleteCategory(category)} className="rounded-lg border border-red-200 p-1.5 text-red-600" aria-label="Kustuta"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </article>
                );
              })}
            </div>

            {categoryEditorOpen ? (
              <div className="mt-4 rounded-xl border border-[#eadde5] bg-[#fffbfd] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f7d88]">{categoryDraft.id ? 'Muuda kategooriat' : 'Uus kategooria'}</p>
                  <button type="button" onClick={() => setCategoryEditorOpen(false)} className="text-[#8a7883]"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-2.5">
                  <input
                    value={editorLanguage === 'et' ? categoryDraft.nameEt : categoryDraft.nameEn}
                    onChange={(event) =>
                      setCategoryDraft((prev) =>
                        editorLanguage === 'et'
                          ? { ...prev, nameEt: event.target.value }
                          : { ...prev, nameEn: event.target.value }
                      )
                    }
                    placeholder={editorLanguage === 'et' ? 'Kategooria nimi' : 'Category name'}
                    className="w-full rounded-lg border border-[#e8dde5] px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm text-[#6f606a]"><input type="checkbox" checked={categoryDraft.active} onChange={(event) => setCategoryDraft((prev) => ({ ...prev, active: event.target.checked }))} /> Aktiivne kategooria</label>
                  <button type="button" onClick={() => void saveCategory()} disabled={busy} className="w-full rounded-lg bg-[#8f3d62] px-3 py-2 text-sm font-semibold text-white">Salvesta kategooria</button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-[#ece2e9] bg-white p-4">
              <div className="mb-4"><p className="text-xs uppercase tracking-[0.14em] text-[#93828d]">1. plokk</p><h2 className="text-lg font-semibold text-[#2a2127]">Teenused selles kategoorias</h2></div>
              {servicesInCategory.length === 0 ? (
                <div className="rounded-xl border border-[#efe6ec] bg-[#fffafd] px-3 py-3 text-sm text-[#746671]">
                  Selles kategoorias veel teenuseid ei ole.
                  <button type="button" onClick={() => { setServiceDraft({ ...emptyServiceDraft, categoryId: selectedCategoryId, sortOrder: servicesInCategory.length }); setServiceEditorOpen(true); }} className="ml-3 inline-flex items-center rounded-full border border-[#eadde5] px-3 py-1 text-xs text-[#6d5e67]">
                    Lisa teenus
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {servicesInCategory.map((service, index) => (
                    <article key={service.id} className="overflow-hidden rounded-xl border border-[#efe6ec] bg-white">
                      <div className="relative aspect-[16/10] bg-[#f4edf1]">{service.imageUrl ? <Image src={service.imageUrl} alt={service.name} fill unoptimized className="object-cover" sizes="(max-width: 768px) 100vw, 420px" /> : null}</div>
                      <div className="p-3.5">
                        <p className="text-base font-semibold text-[#2b2328]">{service.name}</p>
                        <p className="mt-1 text-sm text-[#72656f]">EUR {service.price} - {service.duration} min</p>
                        <div className="mt-3 flex items-center gap-1">
                          <button type="button" onClick={() => void reorderService(service, 'up')} disabled={index === 0} className="rounded-lg border border-[#eadde5] p-1.5 text-[#6e5e68] disabled:opacity-30" aria-label="Tosta ule"><ChevronUp className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => void reorderService(service, 'down')} disabled={index === servicesInCategory.length - 1} className="rounded-lg border border-[#eadde5] p-1.5 text-[#6e5e68] disabled:opacity-30" aria-label="Tosta alla"><ChevronDown className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => { setSelectedServiceId(service.id); setServiceDraft(toServiceDraft(service)); setServiceEditorOpen(true); }} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[#eadde5] px-2.5 py-1.5 text-xs text-[#6c5d67]"><Pencil className="h-3.5 w-3.5" /> Muuda</button>
                          <button type="button" onClick={() => void deleteService(service)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600"><Trash2 className="h-3.5 w-3.5" /> Kustuta</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {serviceEditorOpen ? (
                <div className="mt-5 rounded-xl border border-[#eadde5] bg-[#fffbfd] p-4">
                  <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f7d88]">{serviceDraft.id ? 'Muuda teenust' : 'Uus teenus'}</p><button type="button" onClick={() => setServiceEditorOpen(false)} className="text-[#8a7883]"><X className="h-4 w-4" /></button></div>
                  <div className="grid gap-2.5 md:grid-cols-2">
                    <input
                      value={editorLanguage === 'et' ? serviceDraft.nameEt : serviceDraft.nameEn}
                      onChange={(event) =>
                        setServiceDraft((prev) =>
                          editorLanguage === 'et'
                            ? { ...prev, nameEt: event.target.value }
                            : { ...prev, nameEn: event.target.value }
                        )
                      }
                      placeholder={editorLanguage === 'et' ? 'Teenuse nimi' : 'Service name'}
                      className="rounded-lg border border-[#e8dde5] px-3 py-2 text-sm"
                    />
                    <textarea
                      value={editorLanguage === 'et' ? serviceDraft.descriptionEt : serviceDraft.descriptionEn}
                      onChange={(event) =>
                        setServiceDraft((prev) =>
                          editorLanguage === 'et'
                            ? { ...prev, descriptionEt: event.target.value }
                            : { ...prev, descriptionEn: event.target.value }
                        )
                      }
                      placeholder={editorLanguage === 'et' ? 'Kirjeldus' : 'Description'}
                      rows={3}
                      className="rounded-lg border border-[#e8dde5] px-3 py-2 text-sm"
                    />
                    <input type="number" value={serviceDraft.price} onChange={(event) => setServiceDraft((prev) => ({ ...prev, price: Number(event.target.value || 0) }))} placeholder="Hind" className="rounded-lg border border-[#e8dde5] px-3 py-2 text-sm" />
                    <input type="number" value={serviceDraft.duration} onChange={(event) => setServiceDraft((prev) => ({ ...prev, duration: Number(event.target.value || 0) }))} placeholder="Kestus" className="rounded-lg border border-[#e8dde5] px-3 py-2 text-sm" />
                    <select value={serviceDraft.categoryId} onChange={(event) => { const nextId = event.target.value; setServiceDraft((prev) => ({ ...prev, categoryId: nextId, categoryNameEt: categories.find((c) => c.id === nextId)?.nameEt ?? categories.find((c) => c.id === nextId)?.name ?? prev.categoryNameEt })); }} className="rounded-lg border border-[#e8dde5] px-3 py-2 text-sm"><option value="">Vali kategooria</option>{sortedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                    <div className="space-y-2">
                      <input value={serviceDraft.imageUrl} onChange={(event) => setServiceDraft((prev) => ({ ...prev, imageUrl: event.target.value }))} placeholder="Pildi URL" className="w-full rounded-lg border border-[#e8dde5] px-3 py-2 text-sm" />
                      <input ref={serviceImageUploadRef} type="file" accept="image/*" onChange={(event) => void handleServiceImageUpload(event.target.files)} className="hidden" />
                      <button type="button" onClick={() => serviceImageUploadRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg border border-[#eadde5] px-3 py-1.5 text-xs font-medium text-[#6d5e67]">
                        <Plus className="h-3.5 w-3.5" />
                        Laadi pilt telefonist/arvutist
                      </button>
                    </div>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm text-[#6f606a]"><input type="checkbox" checked={serviceDraft.active} onChange={(event) => setServiceDraft((prev) => ({ ...prev, active: event.target.checked }))} /> Teenus aktiivne</label>
                  <label className="mt-2 flex items-center gap-2 text-sm text-[#6f606a]"><input type="checkbox" checked={serviceDraft.allowAddOns} onChange={(event) => setServiceDraft((prev) => ({ ...prev, allowAddOns: event.target.checked }))} /> Luba sellele teenusele lisateenused</label>
                  <button type="button" onClick={() => void saveService()} disabled={busy} className="mt-3 rounded-lg bg-[#8f3d62] px-4 py-2 text-sm font-semibold text-white">Salvesta teenus</button>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[#ece2e9] bg-white p-4">
              <div className="mb-3 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.14em] text-[#93828d]">2. plokk</p><h2 className="text-lg font-semibold text-[#2a2127]">Valikud (nt hooldus / paigaldus)</h2></div><button type="button" onClick={() => { if (!selectedService) return; setVariantDraft({ ...emptyVariantDraft, serviceId: selectedService.id, orderIndex: selectedServiceVariants.length }); setVariantEditorOpen(true); }} disabled={!selectedService} className="inline-flex items-center gap-1 rounded-full border border-[#eadde5] px-3 py-1 text-xs text-[#6d5e67] disabled:opacity-40"><Plus className="h-3.5 w-3.5" /> Lisa teenus</button></div>
              {!selectedService ? <p className="text-sm text-[#7a6c76]">Vali enne teenus, et hallata selle valikuid.</p> : <><p className="mb-3 text-sm text-[#705f6b]">Valitud teenus: <span className="font-semibold">{selectedService.name}</span></p><div className="space-y-2.5">{selectedServiceVariants.map((variant) => <article key={variant.id} className="rounded-xl border border-[#efe6ec] bg-[#fffdfd] p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-semibold text-[#2d242b]">{variant.name}</p><p className="text-xs text-[#746570]">EUR {variant.price} - {variant.duration} min</p></div><div className="flex items-center gap-1.5"><button type="button" onClick={() => { setVariantDraft({ id: variant.id, serviceId: variant.serviceId, nameEt: variant.nameEt ?? variant.name, nameEn: variant.nameEn ?? '', price: variant.price, duration: variant.duration, isActive: variant.isActive, orderIndex: variant.orderIndex }); setVariantEditorOpen(true); }} className="inline-flex items-center gap-1 rounded-lg border border-[#eadde5] px-2.5 py-1.5 text-xs text-[#6c5d67]"><Pencil className="h-3.5 w-3.5" /> Muuda</button><button type="button" onClick={() => void deleteVariant(variant)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600"><Trash2 className="h-3.5 w-3.5" /> Kustuta</button></div></div></article>)}</div></>}
              {variantEditorOpen ? <div className="mt-4 rounded-xl border border-[#eadde5] bg-[#fffbfd] p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f7d88]">{variantDraft.id ? 'Muuda valikut' : 'Uus valik'}</p><button type="button" onClick={() => setVariantEditorOpen(false)} className="text-[#8a7883]"><X className="h-4 w-4" /></button></div><div className="grid gap-2.5 md:grid-cols-2"><input value={editorLanguage === 'et' ? variantDraft.nameEt : variantDraft.nameEn} onChange={(event) => setVariantDraft((prev) => editorLanguage === 'et' ? ({ ...prev, nameEt: event.target.value }) : ({ ...prev, nameEn: event.target.value }))} placeholder={editorLanguage === 'et' ? 'Valiku nimi' : 'Option name'} className="rounded-lg border border-[#e8dde5] px-3 py-2 text-sm" /><input type="number" value={variantDraft.price} onChange={(event) => setVariantDraft((prev) => ({ ...prev, price: Number(event.target.value || 0) }))} placeholder="Hind" className="rounded-lg border border-[#e8dde5] px-3 py-2 text-sm" /><input type="number" value={variantDraft.duration} onChange={(event) => setVariantDraft((prev) => ({ ...prev, duration: Number(event.target.value || 0) }))} placeholder="Kestus" className="rounded-lg border border-[#e8dde5] px-3 py-2 text-sm" /></div><label className="mt-3 flex items-center gap-2 text-sm text-[#6f606a]"><input type="checkbox" checked={variantDraft.isActive} onChange={(event) => setVariantDraft((prev) => ({ ...prev, isActive: event.target.checked }))} /> Valik aktiivne</label><button type="button" onClick={() => void saveVariant()} disabled={busy} className="mt-3 rounded-lg bg-[#8f3d62] px-4 py-2 text-sm font-semibold text-white">Salvesta valik</button></div> : null}
            </div>

            <div className="rounded-2xl border border-[#ece2e9] bg-white p-4">
              <div className="mb-3 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.14em] text-[#93828d]">3. plokk</p><h2 className="text-lg font-semibold text-[#2a2127]">Lisateenused</h2></div><button type="button" onClick={() => { if (!selectedServiceId) return; setAddOnDraft({ ...emptyAddOnDraft, serviceId: selectedServiceId, sortOrder: serviceAddOns.length }); setAddOnEditorOpen(true); }} disabled={!selectedServiceId || selectedService?.allowAddOns === false} className="inline-flex items-center gap-1 rounded-full border border-[#eadde5] px-3 py-1 text-xs text-[#6d5e67] disabled:opacity-40"><Plus className="h-3.5 w-3.5" /> Lisa teenus</button></div>
              <div className="space-y-2.5">{serviceAddOns.map((addOn) => <article key={addOn.id} className="rounded-xl border border-[#efe6ec] bg-[#fffdfd] p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-semibold text-[#2d242b]">{addOn.nameEt}</p><p className="text-xs text-[#746570]">EUR {addOn.price} - {addOn.duration} min</p></div><div className="flex items-center gap-1.5"><button type="button" onClick={() => { setAddOnDraft(addOn); setAddOnEditorOpen(true); }} className="inline-flex items-center gap-1 rounded-lg border border-[#eadde5] px-2.5 py-1.5 text-xs text-[#6c5d67]"><Pencil className="h-3.5 w-3.5" /> Muuda</button><button type="button" onClick={() => void deleteServiceAddOn(addOn)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600"><Trash2 className="h-3.5 w-3.5" /> Kustuta</button></div></div></article>)}</div>
              {addOnEditorOpen ? <div className="mt-4 rounded-xl border border-[#eadde5] bg-[#fffbfd] p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f7d88]">{addOnDraft.id ? 'Muuda lisateenust' : 'Uus lisateenus'}</p><button type="button" onClick={() => setAddOnEditorOpen(false)} className="text-[#8a7883]"><X className="h-4 w-4" /></button></div><div className="grid gap-2.5 md:grid-cols-2"><input value={editorLanguage === 'et' ? addOnDraft.nameEt : addOnDraft.nameEn} onChange={(event) => setAddOnDraft((prev) => editorLanguage === 'et' ? ({ ...prev, nameEt: event.target.value }) : ({ ...prev, nameEn: event.target.value }))} placeholder={editorLanguage === 'et' ? 'Nimi' : 'Name'} className="rounded-lg border border-[#e8dde5] px-3 py-2 text-sm" /><textarea value={editorLanguage === 'et' ? addOnDraft.descriptionEt : addOnDraft.descriptionEn} onChange={(event) => setAddOnDraft((prev) => editorLanguage === 'et' ? ({ ...prev, descriptionEt: event.target.value }) : ({ ...prev, descriptionEn: event.target.value }))} placeholder={editorLanguage === 'et' ? 'Kirjeldus' : 'Description'} rows={2} className="rounded-lg border border-[#e8dde5] px-3 py-2 text-sm" /><input type="number" value={addOnDraft.price} onChange={(event) => setAddOnDraft((prev) => ({ ...prev, price: Number(event.target.value || 0) }))} placeholder="Hind" className="rounded-lg border border-[#e8dde5] px-3 py-2 text-sm" /><input type="number" value={addOnDraft.duration} onChange={(event) => setAddOnDraft((prev) => ({ ...prev, duration: Number(event.target.value || 0) }))} placeholder="Kestus" className="rounded-lg border border-[#e8dde5] px-3 py-2 text-sm" /></div><label className="mt-3 flex items-center gap-2 text-sm text-[#6f606a]"><input type="checkbox" checked={addOnDraft.active} onChange={(event) => setAddOnDraft((prev) => ({ ...prev, active: event.target.checked }))} /> Lisateenus aktiivne</label><button type="button" onClick={() => void saveServiceAddOn()} disabled={busy} className="mt-3 rounded-lg bg-[#8f3d62] px-4 py-2 text-sm font-semibold text-white">Salvesta lisateenus</button></div> : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

