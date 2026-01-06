import { useEffect, useMemo, useState } from 'react';
import type { PaginatedResponse, RecipeListItemDTO } from '@/types';
import { buildQueryString } from '@/lib/queryString';
import { fetchJson, makeAuthHeaders } from '@/lib/http';
import { useSession } from '@/components/auth/useSession';
import LogoutButton from '@/components/auth/LogoutButton';
import { formatDateDMY } from '@/lib/date';

type DashboardState =
  | { kind: 'loading' }
  | { kind: 'needs-auth' }
  | { kind: 'error'; message: string }
  | {
      kind: 'ready';
      data: RecipeListItemDTO[];
      pagination: PaginatedResponse<RecipeListItemDTO>['pagination'];
    };

export default function MyRecipes() {
  const { accessToken, loading: authLoading } = useSession();
  const [page, setPage] = useState(1);
  const limit = 10;

  const [state, setState] = useState<DashboardState>({ kind: 'loading' });

  const url = useMemo(() => {
    return `/api/recipes${buildQueryString({ page, limit })}`;
  }, [page]);

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken) {
      setState({ kind: 'needs-auth' });
      return;
    }

    let cancelled = false;
    setState({ kind: 'loading' });

    fetchJson<PaginatedResponse<RecipeListItemDTO>>(url, {
      headers: {
        ...makeAuthHeaders(accessToken),
      },
    })
      .then((result) => {
        if (cancelled) return;
        setState({ kind: 'ready', data: result.data, pagination: result.pagination });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to load recipes' });
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, authLoading, url]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My recipes</h1>
        <div className="flex items-center gap-3">
          <a className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800" href="/">
            Home
          </a>
          {!authLoading && accessToken ? (
            <>
              <a className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white" href="/recipes/new">
                New recipe
              </a>
              <LogoutButton />
            </>
          ) : null}
        </div>
      </div>

      {state.kind === 'loading' ? <p className="text-gray-700">Loading…</p> : null}

      {state.kind === 'needs-auth' ? (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-3">
          <p className="text-gray-800">You need to log in to view your recipes.</p>
          <a className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white inline-block" href="/login">
            Go to login
          </a>
        </div>
      ) : null}

      {state.kind === 'error' ? (
        <p className="text-red-600" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.kind === 'ready' ? (
        <>
          {state.data.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-2">
              <p className="text-gray-800">No recipes yet.</p>
              <a className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white inline-block" href="/recipes/new">
                Create your first recipe
              </a>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {state.data.map((recipe) => (
                <li key={recipe.id} className="overflow-hidden bg-white rounded-lg shadow-lg h-[380px] flex flex-col">
                  <a href={`/recipes/${recipe.id}`} className="block h-44 bg-gray-100">
                    {recipe.image_url ? (
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    ) : null}
                  </a>

                  <div className="p-5 flex-1 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <a className="text-lg font-semibold text-gray-900 hover:underline" href={`/recipes/${recipe.id}`}>
                        {recipe.title}
                      </a>
                      <span className="text-xs text-gray-500">{formatDateDMY(recipe.created_at)}</span>
                    </div>

                    <p className="text-sm text-gray-700">Servings: {recipe.servings}</p>
                    {recipe.prep_time !== null ? (
                      <p className="text-sm text-gray-700">Preparation time: {recipe.prep_time} min</p>
                    ) : null}
                    <p className="text-sm text-gray-600">{recipe.is_public ? 'Public' : 'Private'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 disabled:opacity-60"
              disabled={state.pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>

            <p className="text-sm text-gray-700">
              Page {state.pagination.page} of {state.pagination.total_pages}
            </p>

            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 disabled:opacity-60"
              disabled={state.pagination.page >= state.pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
