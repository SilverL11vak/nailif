'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      router.push('/admin/login');
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-full border border-[#ead8e2] bg-white px-4 py-2 text-sm text-[#6f5d53] transition-colors hover:bg-[#fff4fa] disabled:opacity-60"
    >
      {loading ? 'Logi välja...' : 'Logi välja'}
    </button>
  );
}

export default AdminLogoutButton;
