'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';

interface AdminAccount {
  id: string;
  email: string;
  name: string | null;
}

function getStrengthLabel(password: string) {
  if (password.length < 8) return 'Liiga lühike';
  if (password.length < 12) return 'Hea';
  return 'Tugev';
}

export default function AdminAccountPage() {
  const [account, setAccount] = useState<AdminAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [nameDraft, setNameDraft] = useState('Sandra');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadAccount = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/account', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Konto laadimine ebaõnnestus');
      }
      const data = (await response.json()) as { admin?: AdminAccount };
      if (data.admin) {
        setAccount(data.admin);
        setNameDraft(data.admin.name || 'Sandra');
      }
    } catch (loadError) {
      console.error(loadError);
      setError('Konto andmete laadimine ebaõnnestus.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccount();
  }, []);

  const passwordStrength = useMemo(() => getStrengthLabel(newPassword), [newPassword]);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const saveProfile = async () => {
    setSavingProfile(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/admin/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameDraft }),
      });
      const data = (await response.json()) as { error?: string; admin?: AdminAccount };
      if (!response.ok) {
        throw new Error(data.error || 'Profiili salvestamine ebaõnnestus');
      }
      if (data.admin) {
        setAccount(data.admin);
      }
      setSuccess('Profiil uuendatud.');
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : 'Profiili salvestamine ebaõnnestus');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!passwordsMatch) {
      setError('Uus parool ja kinnitus ei kattu.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Uus parool peab olema vähemalt 8 tähemärki.');
      return;
    }

    setSavingPassword(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/admin/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Parooli muutmine ebaõnnestus');
      }
      setSuccess('Parool on muudetud. Palun logi uue parooliga uuesti sisse.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 1200);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : 'Parooli muutmine ebaõnnestus');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6b7280]">Nailify Haldus</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.015em] text-[#111827]">Konto ja turvalisus</h1>
              <p className="mt-2 text-sm text-[#4b5563]">
                {loading ? 'Laen kontot...' : `Sisse logitud: ${account?.email ?? '-'}`}
              </p>
            </div>
            <Link className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-sm text-[#4b5563]" href="/admin">
              Halduspaneel
            </Link>
          </div>
        </header>

        <AdminQuickActions />

        {(error || success) && (
          <div
            className={`mb-4 rounded-2xl px-4 py-3 text-sm ${
              error
                ? 'border border-red-200 bg-red-50 text-red-700'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="admin-surface-soft rounded-3xl border border-[#e5e7eb] bg-[linear-gradient(165deg,#fff_0%,#fbf7f2_100%)] p-6 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.28)]">
            <h2 className="text-xl font-semibold text-[#2a211d]">Profiil</h2>
            <p className="mt-1 text-sm text-[#7a665c]">Seda nime näidatakse halduspaneeli tervituses.</p>
            <label className="mt-4 block text-sm text-[#4b5563]">
              Kuva nimi
              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Sandra"
                className="mt-1 w-full rounded-xl border border-[#e5ddd3] bg-white px-3 py-2 outline-none transition-colors focus:border-[#9ca3af]"
              />
            </label>
            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="mt-4 rounded-full bg-[#111827] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0b1220] disabled:opacity-60"
            >
              {savingProfile ? 'Salvestan...' : 'Salvesta profiil'}
            </button>
          </section>

          <section className="admin-surface rounded-3xl border border-[#e5e7eb] bg-white/95 p-6 shadow-[0_24px_36px_-30px_rgba(61,45,37,0.35)]">
            <h2 className="text-xl font-semibold text-[#2a211d]">Muuda parooli</h2>
            <p className="mt-1 text-sm text-[#7a665c]">Kasuta turvalist parooli (vähemalt 8 tähemärki).</p>

            <label className="mt-4 block text-sm text-[#4b5563]">
              Praegune parool
              <div className="mt-1 flex items-center rounded-xl border border-[#e7d9d1] bg-white px-3">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full py-2 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="text-xs font-medium text-[#6b7280]"
                >
                  {showCurrentPassword ? 'Peida' : 'Näita'}
                </button>
              </div>
            </label>

            <label className="mt-3 block text-sm text-[#4b5563]">
              Uus parool
              <div className="mt-1 flex items-center rounded-xl border border-[#e7d9d1] bg-white px-3">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full py-2 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="text-xs font-medium text-[#6b7280]"
                >
                  {showNewPassword ? 'Peida' : 'Näita'}
                </button>
              </div>
            </label>

            <label className="mt-3 block text-sm text-[#4b5563]">
              Kinnita uus parool
              <div className="mt-1 flex items-center rounded-xl border border-[#e7d9d1] bg-white px-3">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full py-2 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="text-xs font-medium text-[#6b7280]"
                >
                  {showConfirmPassword ? 'Peida' : 'Näita'}
                </button>
              </div>
            </label>

            <div className="mt-3 flex items-center justify-between text-xs text-[#6b7280]">
              <span>Parooli tugevus: {passwordStrength}</span>
              <span>{passwordsMatch ? 'Paroolid kattuvad' : 'Paroolid ei kattu'}</span>
            </div>

            <button
              onClick={savePassword}
              disabled={savingPassword}
              className="mt-4 rounded-full bg-[#2f2530] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1f171f] disabled:opacity-60"
            >
              {savingPassword ? 'Uuendan...' : 'Uuenda parooli'}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
