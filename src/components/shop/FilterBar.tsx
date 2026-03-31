'use client';

import { SlidersHorizontal } from 'lucide-react';
import { CategoryPill } from '@/components/shop/CategoryPill';

interface FilterBarProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  allLabel: string;
  sortLabel: string;
  mobileFiltersLabel: string;
  onOpenMobileFilters: () => void;
  sortOptions: Array<{ value: string; label: string }>;
}

export function FilterBar({
  categories,
  activeCategory,
  onCategoryChange,
  sortValue,
  onSortChange,
  allLabel,
  sortLabel,
  mobileFiltersLabel,
  onOpenMobileFilters,
  sortOptions,
}: FilterBarProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-[#ecdde6] bg-white/85 p-4 shadow-[0_18px_34px_-28px_rgba(95,63,86,0.28)]">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <button type="button" onClick={onOpenMobileFilters} className="btn-secondary btn-secondary-sm inline-flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          {mobileFiltersLabel}
        </button>
        <label className="flex items-center gap-2 text-sm text-[#6f5d6d]">
          <span>{sortLabel}</span>
          <select
            value={sortValue}
            onChange={(event) => onSortChange(event.target.value)}
            className="rounded-xl border border-[#e8d9e2] bg-white px-3 py-2 text-sm text-[#2f2530]"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="hidden items-center justify-between gap-4 md:flex">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryPill label={allLabel} active={activeCategory === 'all'} onClick={() => onCategoryChange('all')} />
          {categories.map((category) => (
            <CategoryPill
              key={category}
              label={category}
              active={activeCategory === category}
              onClick={() => onCategoryChange(category)}
            />
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-[#6f5d6d]">
          <span>{sortLabel}</span>
          <select
            value={sortValue}
            onChange={(event) => onSortChange(event.target.value)}
            className="rounded-xl border border-[#e8d9e2] bg-white px-3 py-2 text-sm text-[#2f2530]"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <CategoryPill label={allLabel} active={activeCategory === 'all'} onClick={() => onCategoryChange('all')} />
        {categories.map((category) => (
          <CategoryPill
            key={category}
            label={category}
            active={activeCategory === category}
            onClick={() => onCategoryChange(category)}
          />
        ))}
      </div>
    </div>
  );
}
