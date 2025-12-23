import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logout } from '@/lib/authActions';

export default function LogoutButton() {
  const [submitting, setSubmitting] = useState(false);

  async function onClick() {
    setSubmitting(true);
    try {
      await logout(supabase);
    } finally {
      setSubmitting(false);
      window.location.href = '/';
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 disabled:opacity-60"
    >
      {submitting ? 'Logging out…' : 'Logout'}
    </button>
  );
}
