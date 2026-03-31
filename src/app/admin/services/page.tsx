'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react';
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

type ServicesStep = 'categories' | 'services' | 'variants' | 'addons';

function AdminFormModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className="absolute inset-0 bg-[#2f2230]/35 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Sulge aken"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[20px] border border-[#eadbe4] bg-white p-4 shadow-[0_-16px_40px_-20px_rgba(73,50,66,0.55)] md:inset-auto md:left-1/2 md:top-1/2 md:w-[640px] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-[#2a2127]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#eadde5] text-[#756671] transition hover:bg-[#fff6fb]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

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
  const [step, setStep] = useState<ServicesStep>('categories');
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

  const selectedCategory = useMemo(
    () => sortedCategories.find((category) => category.id === selectedCategoryId) ?? null,
    [selectedCategoryId, sortedCategories]
  );

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [selectedServiceId, services]
  );

  const selectedServiceVariants = useMemo(
    () => [...(selectedService?.variants ?? [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [selectedService?.variants]
  );

  const categoryLabel = (category: ServiceCategory) => category.nameEt?.trim() || category.name || 'Nimetu kategooria';
  const serviceLabel = (service: AdminService) => service.nameEt?.trim() || service.name || 'Nimetu teenus';

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
    if (step !== 'categories' && !selectedCategoryId) {
      setStep('categories');
      return;
    }
    if ((step === 'variants' || step === 'addons') && !selectedServiceId) {
      setStep('services');
    }
  }, [selectedCategoryId, selectedServiceId, step]);

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

  const openCategoryEditor = (category?: ServiceCategory) => {
    setEditorLanguage('et');
    if (category) {
      setCategoryDraft(toCategoryDraft(category));
    } else {
      setCategoryDraft({ ...emptyCategoryDraft, sortOrder: sortedCategories.length });
    }
    setCategoryEditorOpen(true);
  };

  const openServiceEditor = (service?: AdminService) => {
    setEditorLanguage('et');
    if (service) {
      setSelectedServiceId(service.id);
      setServiceDraft(toServiceDraft(service));
    } else {
      setServiceDraft({
        ...emptyServiceDraft,
        categoryId: selectedCategoryId,
        categoryNameEt: selectedCategory ? categoryLabel(selectedCategory) : '',
        sortOrder: servicesInCategory.length,
      });
    }
    setServiceEditorOpen(true);
  };

  const openVariantEditor = (variant?: ServiceVariant) => {
    if (!selectedService) return;
    setEditorLanguage('et');
    if (variant) {
      setVariantDraft({
        id: variant.id,
        serviceId: variant.serviceId,
        nameEt: variant.nameEt ?? variant.name,
        nameEn: variant.nameEn ?? '',
        price: variant.price,
        duration: variant.duration,
        isActive: variant.isActive,
        orderIndex: variant.orderIndex,
      });
    } else {
      setVariantDraft({
        ...emptyVariantDraft,
        serviceId: selectedService.id,
        orderIndex: selectedServiceVariants.length,
      });
    }
    setVariantEditorOpen(true);
  };

  const openAddOnEditor = (addOn?: AddOnEntry) => {
    if (!selectedServiceId) return;
    setEditorLanguage('et');
    if (addOn) {
      setAddOnDraft({ ...addOn, serviceId: addOn.serviceId ?? selectedServiceId });
    } else {
      setAddOnDraft({
        ...emptyAddOnDraft,
        serviceId: selectedServiceId,
        sortOrder: serviceAddOns.length,
      });
    }
    setAddOnEditorOpen(true);
  };

  return (
    <main className="space-y-4">
      <div className="admin-v2-surface overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-[#ead8e3] via-[#f2e8ee] to-transparent" aria-hidden />
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b8794]">Teenused</p>
              <h1 className="text-2xl font-semibold text-[#2a2127] sm:text-3xl">Teenuste haldus</h1>
              <p className="text-sm text-[#756671]">Vali, muuda ja salvesta nelja lihtsa sammuga.</p>
            </div>
            <Link href="/admin" className="admin-v2-btn-secondary px-4 py-2 text-sm">
              <ArrowLeft className="h-4 w-4" />
              Tagasi
            </Link>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'categories', label: '1. Kategooria', enabled: true },
              { id: 'services', label: '2. Teenus', enabled: Boolean(selectedCategoryId) },
              { id: 'variants', label: '3. Valikud', enabled: Boolean(selectedServiceId) },
              { id: 'addons', label: '4. Lisateenused', enabled: Boolean(selectedServiceId) },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={!item.enabled}
                onClick={() => setStep(item.id as ServicesStep)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  step === item.id
                    ? 'border-[#cf8fb0] bg-[#fdf0f7] text-[#713b59]'
                    : 'border-[#eadde5] bg-white text-[#7a6a75]'
                } ${!item.enabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-[#fff7fc]'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {toast && <div className="rounded-xl border border-[#e7d9e2] bg-white px-4 py-2 text-sm text-[#6b5b65]">{toast}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {step === 'categories' && (
        <section className="admin-v2-surface p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-[#2b2328]">Samm 1: Kategooriad</h2>
              <p className="text-sm text-[#7d6b77]">Vali kategooria või loo uus.</p>
            </div>
            <button type="button" onClick={() => openCategoryEditor()} className="admin-v2-btn-primary px-4 py-2 text-sm">
              <Plus className="h-4 w-4" />
              Lisa kategooria
            </button>
          </div>

          <div className="space-y-3">
            {sortedCategories.map((category) => {
              const selected = category.id === selectedCategoryId;
              return (
                <article
                  key={category.id}
                  className={`rounded-2xl border p-4 transition ${
                    selected ? 'border-[#d7b0c7] bg-[#fff7fb]' : 'border-[#efe7ec] bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(category.id);
                      setStep('services');
                    }}
                    className="w-full text-left"
                  >
                    <p className="text-base font-semibold text-[#2e242b]">{categoryLabel(category)}</p>
                    <p className="mt-1 text-sm text-[#7a6a74]">{category.active === false ? 'Peidetud' : 'Aktiivne'}</p>
                  </button>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openCategoryEditor(category)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#eadde5] text-[#6e5e68]"
                      aria-label="Muuda kategooriat"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCategory(category)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200 text-red-600"
                      aria-label="Kustuta kategooria"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {step === 'services' && (
        <section className="admin-v2-surface p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setStep('categories')}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#7a6574] hover:text-[#5f4a59]"
              >
                <ArrowLeft className="h-4 w-4" />
                Tagasi kategooriatesse
              </button>
              <h2 className="text-lg font-semibold text-[#2b2328]">Samm 2: Teenused</h2>
              <p className="text-sm text-[#7d6b77]">Kategooria: {selectedCategory ? categoryLabel(selectedCategory) : 'Valimata'}</p>
            </div>
            <button
              type="button"
              onClick={() => openServiceEditor()}
              disabled={!selectedCategoryId}
              className="admin-v2-btn-primary px-4 py-2 text-sm disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Lisa teenus
            </button>
          </div>

          {servicesInCategory.length === 0 ? (
            <div className="rounded-2xl border border-[#efe6ec] bg-[#fffafd] px-4 py-5 text-sm text-[#746671]">
              Selles kategoorias veel teenuseid ei ole.
            </div>
          ) : (
            <div className="space-y-3">
              {servicesInCategory.map((service) => (
                <article key={service.id} className="overflow-hidden rounded-2xl border border-[#efe6ec] bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedServiceId(service.id);
                      setStep('variants');
                    }}
                    className="w-full text-left"
                  >
                    <div className="relative aspect-[16/9] bg-[#f4edf1]">
                      {service.imageUrl && (
                        <Image
                          src={service.imageUrl}
                          alt={serviceLabel(service)}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 700px"
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-base font-semibold text-[#2b2328]">{serviceLabel(service)}</p>
                      <p className="mt-1 text-sm text-[#72656f]">EUR {service.price} - {service.duration} min</p>
                    </div>
                  </button>
                  <div className="border-t border-[#f1e8ee] px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openServiceEditor(service)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#eadde5] text-[#6e5e68]"
                        aria-label="Muuda teenust"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteService(service)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200 text-red-600"
                        aria-label="Kustuta teenus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 'variants' && (
        <section className="admin-v2-surface p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setStep('services')}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#7a6574] hover:text-[#5f4a59]"
              >
                <ArrowLeft className="h-4 w-4" />
                Tagasi teenustesse
              </button>
              <h2 className="text-lg font-semibold text-[#2b2328]">Samm 3: Teenuse valikud</h2>
              <p className="text-sm text-[#7d6b77]">Teenus: {selectedService ? serviceLabel(selectedService) : 'Valimata'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openVariantEditor()}
                disabled={!selectedService}
                className="admin-v2-btn-primary px-4 py-2 text-sm disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Lisa valik
              </button>
              <button
                type="button"
                onClick={() => setStep('addons')}
                disabled={!selectedService}
                className="admin-v2-btn-secondary px-4 py-2 text-sm disabled:opacity-40"
              >
                Edasi lisateenustesse
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!selectedService ? (
            <p className="text-sm text-[#7a6c76]">Vali enne teenus.</p>
          ) : selectedServiceVariants.length === 0 ? (
            <div className="rounded-2xl border border-[#efe6ec] bg-[#fffafd] px-4 py-5 text-sm text-[#746671]">
              Sellel teenusel veel valikuid ei ole.
            </div>
          ) : (
            <div className="divide-y divide-[#f0e5ed] rounded-2xl border border-[#efe6ec] bg-white">
              {selectedServiceVariants.map((variant) => (
                <div key={variant.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2d242b]">{variant.nameEt ?? variant.name}</p>
                    <p className="text-xs text-[#746570]">EUR {variant.price} - {variant.duration} min</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openVariantEditor(variant)}
                      className="rounded-full border border-[#eadde5] px-3 py-1.5 text-xs font-medium text-[#6c5d67]"
                    >
                      Muuda
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteVariant(variant)}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600"
                    >
                      Kustuta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 'addons' && (
        <section className="admin-v2-surface p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setStep('variants')}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#7a6574] hover:text-[#5f4a59]"
              >
                <ArrowLeft className="h-4 w-4" />
                Tagasi valikutesse
              </button>
              <h2 className="text-lg font-semibold text-[#2b2328]">Samm 4: Lisateenused</h2>
              <p className="text-sm text-[#7d6b77]">Teenus: {selectedService ? serviceLabel(selectedService) : 'Valimata'}</p>
            </div>
            <button
              type="button"
              onClick={() => openAddOnEditor()}
              disabled={!selectedServiceId || selectedService?.allowAddOns === false}
              className="admin-v2-btn-primary px-4 py-2 text-sm disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Lisa lisateenus
            </button>
          </div>

          {!selectedService ? (
            <p className="text-sm text-[#7a6c76]">Vali enne teenus.</p>
          ) : serviceAddOns.length === 0 ? (
            <div className="rounded-2xl border border-[#efe6ec] bg-[#fffafd] px-4 py-5 text-sm text-[#746671]">
              Lisateenuseid ei ole lisatud.
            </div>
          ) : (
            <div className="divide-y divide-[#f0e5ed] rounded-2xl border border-[#efe6ec] bg-white">
              {serviceAddOns.map((addOn) => (
                <div key={addOn.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2d242b]">{addOn.nameEt}</p>
                    <p className="text-xs text-[#746570]">EUR {addOn.price} - {addOn.duration} min</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openAddOnEditor(addOn)}
                      className="rounded-full border border-[#eadde5] px-3 py-1.5 text-xs font-medium text-[#6c5d67]"
                    >
                      Muuda
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteServiceAddOn(addOn)}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600"
                    >
                      Kustuta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <AdminFormModal
        open={categoryEditorOpen}
        title={categoryDraft.id ? 'Muuda kategooriat' : 'Uus kategooria'}
        onClose={() => setCategoryEditorOpen(false)}
      >
        <div className="space-y-3">
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
              English
            </button>
          </div>
          <input
            value={editorLanguage === 'et' ? categoryDraft.nameEt : categoryDraft.nameEn}
            onChange={(event) =>
              setCategoryDraft((prev) =>
                editorLanguage === 'et' ? { ...prev, nameEt: event.target.value } : { ...prev, nameEn: event.target.value }
              )
            }
            placeholder={editorLanguage === 'et' ? 'Kategooria nimi' : 'Category name'}
            className="w-full rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-[#6f606a]">
            <input type="checkbox" checked={categoryDraft.active} onChange={(event) => setCategoryDraft((prev) => ({ ...prev, active: event.target.checked }))} />
            Aktiivne kategooria
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setCategoryEditorOpen(false)} className="admin-v2-btn-secondary flex-1 py-2.5 text-sm">
              Tühista
            </button>
            <button type="button" onClick={() => void saveCategory()} disabled={busy} className="admin-v2-btn-primary flex-1 py-2.5 text-sm">
              Salvesta
            </button>
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={serviceEditorOpen}
        title={serviceDraft.id ? 'Muuda teenust' : 'Uus teenus'}
        onClose={() => setServiceEditorOpen(false)}
      >
        <div className="space-y-3">
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
              English
            </button>
          </div>
          <input
            value={editorLanguage === 'et' ? serviceDraft.nameEt : serviceDraft.nameEn}
            onChange={(event) =>
              setServiceDraft((prev) =>
                editorLanguage === 'et' ? { ...prev, nameEt: event.target.value } : { ...prev, nameEn: event.target.value }
              )
            }
            placeholder={editorLanguage === 'et' ? 'Teenuse nimi' : 'Service name'}
            className="w-full rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
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
            className="w-full rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={serviceDraft.price}
              onChange={(event) => setServiceDraft((prev) => ({ ...prev, price: Number(event.target.value || 0) }))}
              placeholder="Hind"
              className="rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
            />
            <input
              type="number"
              value={serviceDraft.duration}
              onChange={(event) => setServiceDraft((prev) => ({ ...prev, duration: Number(event.target.value || 0) }))}
              placeholder="Kestus"
              className="rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
            />
          </div>
          <select
            value={serviceDraft.categoryId}
            onChange={(event) => {
              const nextId = event.target.value;
              setServiceDraft((prev) => ({
                ...prev,
                categoryId: nextId,
                categoryNameEt:
                  categories.find((category) => category.id === nextId)?.nameEt ??
                  categories.find((category) => category.id === nextId)?.name ??
                  prev.categoryNameEt,
              }));
            }}
            className="w-full rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
          >
            <option value="">Vali kategooria</option>
            {sortedCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
          <div className="space-y-2">
            <input
              value={serviceDraft.imageUrl}
              onChange={(event) => setServiceDraft((prev) => ({ ...prev, imageUrl: event.target.value }))}
              placeholder="Pildi URL"
              className="w-full rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
            />
            <input
              ref={serviceImageUploadRef}
              type="file"
              accept="image/*"
              onChange={(event) => void handleServiceImageUpload(event.target.files)}
              className="hidden"
            />
            <button type="button" onClick={() => serviceImageUploadRef.current?.click()} className="admin-v2-btn-secondary px-4 py-2 text-sm">
              <Plus className="h-4 w-4" />
              Laadi pilt
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#6f606a]">
            <input type="checkbox" checked={serviceDraft.active} onChange={(event) => setServiceDraft((prev) => ({ ...prev, active: event.target.checked }))} />
            Teenus aktiivne
          </label>
          <label className="flex items-center gap-2 text-sm text-[#6f606a]">
            <input type="checkbox" checked={serviceDraft.allowAddOns} onChange={(event) => setServiceDraft((prev) => ({ ...prev, allowAddOns: event.target.checked }))} />
            Luba lisateenused
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setServiceEditorOpen(false)} className="admin-v2-btn-secondary flex-1 py-2.5 text-sm">
              Tühista
            </button>
            <button type="button" onClick={() => void saveService()} disabled={busy} className="admin-v2-btn-primary flex-1 py-2.5 text-sm">
              Salvesta
            </button>
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={variantEditorOpen}
        title={variantDraft.id ? 'Muuda valikut' : 'Uus valik'}
        onClose={() => setVariantEditorOpen(false)}
      >
        <div className="space-y-3">
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
              English
            </button>
          </div>
          <input
            value={editorLanguage === 'et' ? variantDraft.nameEt : variantDraft.nameEn}
            onChange={(event) =>
              setVariantDraft((prev) =>
                editorLanguage === 'et' ? { ...prev, nameEt: event.target.value } : { ...prev, nameEn: event.target.value }
              )
            }
            placeholder={editorLanguage === 'et' ? 'Valiku nimi' : 'Option name'}
            className="w-full rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={variantDraft.price}
              onChange={(event) => setVariantDraft((prev) => ({ ...prev, price: Number(event.target.value || 0) }))}
              placeholder="Hind"
              className="rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
            />
            <input
              type="number"
              value={variantDraft.duration}
              onChange={(event) => setVariantDraft((prev) => ({ ...prev, duration: Number(event.target.value || 0) }))}
              placeholder="Kestus"
              className="rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#6f606a]">
            <input type="checkbox" checked={variantDraft.isActive} onChange={(event) => setVariantDraft((prev) => ({ ...prev, isActive: event.target.checked }))} />
            Valik aktiivne
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setVariantEditorOpen(false)} className="admin-v2-btn-secondary flex-1 py-2.5 text-sm">
              Tühista
            </button>
            <button type="button" onClick={() => void saveVariant()} disabled={busy} className="admin-v2-btn-primary flex-1 py-2.5 text-sm">
              Salvesta
            </button>
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={addOnEditorOpen}
        title={addOnDraft.id ? 'Muuda lisateenust' : 'Uus lisateenus'}
        onClose={() => setAddOnEditorOpen(false)}
      >
        <div className="space-y-3">
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
              English
            </button>
          </div>
          <input
            value={editorLanguage === 'et' ? addOnDraft.nameEt : addOnDraft.nameEn}
            onChange={(event) =>
              setAddOnDraft((prev) =>
                editorLanguage === 'et' ? { ...prev, nameEt: event.target.value } : { ...prev, nameEn: event.target.value }
              )
            }
            placeholder={editorLanguage === 'et' ? 'Nimi' : 'Name'}
            className="w-full rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
          />
          <textarea
            value={editorLanguage === 'et' ? addOnDraft.descriptionEt : addOnDraft.descriptionEn}
            onChange={(event) =>
              setAddOnDraft((prev) =>
                editorLanguage === 'et'
                  ? { ...prev, descriptionEt: event.target.value }
                  : { ...prev, descriptionEn: event.target.value }
              )
            }
            placeholder={editorLanguage === 'et' ? 'Kirjeldus' : 'Description'}
            rows={3}
            className="w-full rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={addOnDraft.price}
              onChange={(event) => setAddOnDraft((prev) => ({ ...prev, price: Number(event.target.value || 0) }))}
              placeholder="Hind"
              className="rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
            />
            <input
              type="number"
              value={addOnDraft.duration}
              onChange={(event) => setAddOnDraft((prev) => ({ ...prev, duration: Number(event.target.value || 0) }))}
              placeholder="Kestus"
              className="rounded-xl border border-[#e8dde5] px-3 py-3 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#6f606a]">
            <input type="checkbox" checked={addOnDraft.active} onChange={(event) => setAddOnDraft((prev) => ({ ...prev, active: event.target.checked }))} />
            Lisateenus aktiivne
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAddOnEditorOpen(false)} className="admin-v2-btn-secondary flex-1 py-2.5 text-sm">
              Tühista
            </button>
            <button type="button" onClick={() => void saveServiceAddOn()} disabled={busy} className="admin-v2-btn-primary flex-1 py-2.5 text-sm">
              Salvesta
            </button>
          </div>
        </div>
      </AdminFormModal>
    </main>
  );
}
