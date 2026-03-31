'use client';

interface CategoryPillProps {
  label: string;
  active?: boolean;
  onClick: () => void;
}

export function CategoryPill({ label, active = false, onClick }: CategoryPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pill-selectable min-h-[42px] px-4 text-sm ${active ? 'is-selected' : ''}`}
    >
      {label}
    </button>
  );
}
