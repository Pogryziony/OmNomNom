import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { loginWithEmailPassword } from '@/lib/authActions';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await loginWithEmailPassword(supabase, email.trim(), password);
      const maybeError = (result as { error?: { message?: string } }).error;
      if (maybeError?.message) {
        setErrorMessage(maybeError.message);
        return;
      }
      window.location.href = '/dashboard';
    } catch {
      setErrorMessage('Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"
      >
        {submitting ? 'Logging in…' : 'Login'}
      </button>

      <p className="text-sm text-gray-700">
        No account?{' '}
        <a className="text-indigo-600 underline" href="/signup">
          Sign up
        </a>
      </p>
    </form>
  );
}
