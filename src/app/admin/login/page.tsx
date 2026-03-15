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
    <main className="admin-shell min-h-screen bg-[radial-gradient(circle_at_top,_#fff_0%,_#f7efe9_48%,_#f3e8df_100%)] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.05fr_1fr]">
        <section className="admin-surface-soft rounded-3xl border border-[#e8e0d9] bg-[linear-gradient(165deg,#fff_0%,#fbf7f2_100%)] p-7 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.28)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#b08979]">Nailify Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#2a211d]">
            {loadingStatus ? 'Laen...' : hasAdmin ? 'Logi sisse' : 'Loo admin'}
          </h1>
          <p className="mt-2 text-sm text-[#6f5d53]">
            {hasAdmin
              ? 'Turvaline ligipääs teenustele, broneeringutele, aegadele ja toodetele.'
              : 'Admin kontot pole veel loodud. Loo esimene konto Neon andmebaasi.'}
          </p>
          <div className="mt-6 rounded-2xl border border-[#eadfd7] bg-white/85 p-4 text-sm text-[#6f5d53]">
            <p className="font-medium text-[#3f312a]">Kiirmärkmed</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>Kuvanimi kuvatakse tervituses: Tere, Sandra</li>
              <li>Parooli saab muuta Konto ja turvalisus lehel</li>
              <li>Sessioonid on kaitstud HTTP-only küpsistega</li>
            </ul>
          </div>
        </section>

        <section className="admin-surface rounded-3xl border border-[#ece3db] bg-white/95 p-6 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.35)]">
          <form onSubmit={handleSubmit} className="space-y-3">
            {!hasAdmin && !loadingStatus && (
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Admin nimi"
                className="w-full rounded-xl border border-[#e5ddd3] px-3 py-2 outline-none transition-colors focus:border-[#8a5e76]"
              />
            )}
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="admin@nailify.ee"
              className="w-full rounded-xl border border-[#e5ddd3] px-3 py-2 outline-none transition-colors focus:border-[#8a5e76]"
              required
            />
            <div className="flex items-center rounded-xl border border-[#e5ddd3] px-3">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="Parool"
                className="w-full py-2 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs font-medium text-[#8b7568]"
              >
                {showPassword ? 'Peida' : 'Näita'}
              </button>
            </div>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting || loadingStatus}
              className="w-full rounded-xl bg-[#8a5e76] py-3 font-semibold text-white transition-colors hover:bg-[#774f66] disabled:opacity-50"
            >
              {isSubmitting ? 'Palun oota...' : hasAdmin ? 'Logi sisse' : 'Loo konto ja logi sisse'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
