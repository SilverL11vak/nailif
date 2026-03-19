'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

const HELP_TEXT =
  'Temporarily disable all custom analytics collection during early development. When off, no session/event/slot or behavior tracking runs and no analytics API calls are made.';

export function AdminAnalyticsToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings/analytics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const data = (await res.json()) as { ok?: boolean; enabled?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to update');
        return;
      }
      setEnabled(data.enabled ?? !enabled);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [enabled, router]);

  return (
    <div className="rounded-[26px] border border-[#efe5ea] bg-white/90 p-5 shadow-[0_18px_46px_-34px_rgba(57,33,52,0.2)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <p className="text-sm font-semibold text-[#2f2530]">Analytics tracking</p>
          <p className="mt-1 text-[13px] text-[#6f6168]">{HELP_TEXT}</p>
          {error ? <p className="mt-2 text-[13px] font-medium text-red-600">{error}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-[#5c4f55]">{enabled ? 'On' : 'Off'}</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={loading}
            onClick={handleToggle}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#c24d86]/40 focus:ring-offset-2 ${
              enabled ? 'border-[#c24d86] bg-[#c24d86]' : 'border-[#d4c8ce] bg-[#e8e0e4]'
            } ${loading ? 'opacity-70' : ''}`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
