'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('Sandra');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const response = await fetch('/api/admin/status', { cache: 'no-store' });
        if (!response.ok) throw new Error('Staatuse laadimine ebaõnnestus');
        const data = (await response.json()) as { hasAdmin?: boolean };
        if (mounted) {
          setHasAdmin(Boolean(data.hasAdmin));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoadingStatus(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          createIfEmpty: !hasAdmin,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Sisselogimine ebaõnnestus');
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sisselogimine ebaõnnestus');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-cockpit-bg px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.05fr_1fr]">
        <section className="admin-surface-soft p-7">
          <p className="type-overline text-[var(--color-text-muted)]">Nailify Admin</p>
          <h1 className="section-title font-brand mt-1">
            {loadingStatus ? 'Laen...' : hasAdmin ? 'Logi sisse' : 'Loo admin'}
          </h1>
          <p className="type-body mt-2 text-[var(--color-text-muted)]">
            {hasAdmin
              ? 'Turvaline ligipääs teenustele, broneeringutele, aegadele ja toodetele.'
              : 'Admin kontot pole veel loodud. Loo esimene konto Neon andmebaasi.'}
          </p>
          <div className="card-premium-soft mt-6 p-4">
            <p className="card-title">Kiirmärkmed</p>
            <ul className="mt-2 space-y-1 type-small text-[var(--color-text-muted)]">
              <li>Kuvanimi kuvatakse tervituses: Tere, Sandra</li>
              <li>Parooli saab muuta Konto ja turvalisus lehel</li>
              <li>Sessioonid on kaitstud HTTP-only küpsistega</li>
            </ul>
          </div>
        </section>

        <section className="admin-surface p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            {!hasAdmin && !loadingStatus && (
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Admin nimi"
                className="input-premium"
              />
            )}
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="admin@nailify.ee"
              className="input-premium"
              required
            />
            <div className="flex items-center overflow-hidden rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-white [&:focus-within]:border-[var(--color-primary)] [&:focus-within]:shadow-[0_0_0_3px_rgba(194,77,134,0.18)]">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="Parool"
                className="w-full border-0 bg-transparent px-4 py-3 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs font-medium text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
              >
                {showPassword ? 'Peida' : 'Näita'}
              </button>
            </div>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting || loadingStatus}
              className="btn-primary btn-primary-lg w-full disabled:opacity-50"
            >
              {isSubmitting ? 'Palun oota...' : hasAdmin ? 'Logi sisse' : 'Loo konto ja logi sisse'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
