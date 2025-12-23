import { useEffect, useMemo, useState } from 'react';
import type { DeleteResponse, RecipeDTO, RecipeVisibilityDTO } from '@/types';
import { fetchJson, makeAuthHeaders } from '@/lib/http';
import { useSession } from '@/components/auth/useSession';
import LogoutButton from '@/components/auth/LogoutButton';
import { isOwner } from '@/lib/ownership';
import { mapRecipeDetailStatusToUiState, type RecipeDetailUiState } from '@/lib/recipeDetailState';

interface Props {
  recipeId: string;
}

type State =
  | { kind: 'loading' }
  | { kind: 'ui'; ui: RecipeDetailUiState }
  | { kind: 'ready'; recipe: RecipeDTO };

export default function RecipeDetail({ recipeId }: Props) {
  const { accessToken, user, loading: authLoading } = useSession();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const recipeUrl = useMemo(() => `/api/recipes/${recipeId}`, [recipeId]);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });

    const headers = {
      ...(accessToken ? makeAuthHeaders(accessToken) : {}),
    };

    fetch(recipeUrl, { headers })
      .then(async (response) => {
        if (cancelled) return;

        if (!response.ok) {
          setState({ kind: 'ui', ui: mapRecipeDetailStatusToUiState(response.status) });
          return;
        }

        const recipe = (await response.json()) as RecipeDTO;
        setState({ kind: 'ready', recipe });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ kind: 'ui', ui: { kind: 'error', message: 'Failed to load recipe' } });
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, recipeUrl]);

  const currentRecipe = state.kind === 'ready' ? state.recipe : null;
  const owner = isOwner(currentRecipe?.user_id, user?.id);

  async function onToggleVisibility(nextValue: boolean) {
    if (!accessToken) return;
    if (!currentRecipe) return;

    setActionError(null);
    setActionBusy(true);

    try {
      const result = await fetchJson<RecipeVisibilityDTO>(`/api/recipes/${recipeId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...makeAuthHeaders(accessToken),
        },
        body: JSON.stringify({ is_public: nextValue }),
      });

      setState({
        kind: 'ready',
        recipe: {
          ...currentRecipe,
          is_public: result.is_public,
          published_at: result.published_at,
          unpublished_at: result.unpublished_at,
        },
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update visibility');
    } finally {
      setActionBusy(false);
    }
  }

  async function onDelete() {
    if (!accessToken) return;

    setActionError(null);
    setActionBusy(true);

    try {
      await fetchJson<DeleteResponse>(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: {
          ...makeAuthHeaders(accessToken),
        },
      });

      window.location.href = '/dashboard';
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete recipe');
      setActionBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-x-3 text-sm">
          <a className="text-indigo-600 underline" href="/">
            Home
          </a>
          <a className="text-indigo-600 underline" href="/dashboard">
            Dashboard
          </a>
        </div>
        {!authLoading && accessToken ? <LogoutButton /> : null}
      </div>

      {state.kind === 'loading' ? <p className="text-gray-700">Loading…</p> : null}

      {state.kind === 'ui' ? (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-3">
          {state.ui.kind === 'auth-required' ? (
            <>
              <p className="text-gray-800">Login required to view this private recipe.</p>
              <a className="text-indigo-600 underline" href="/login">
                Go to login
              </a>
            </>
          ) : null}

          {state.ui.kind === 'access-denied' ? <p className="text-gray-800">Access denied.</p> : null}
          {state.ui.kind === 'not-found' ? <p className="text-gray-800">Recipe not found.</p> : null}
          {state.ui.kind === 'error' ? (
            <p className="text-red-600" role="alert">
              {state.ui.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.kind === 'ready' ? (
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">{state.recipe.title}</h1>
            <p className="text-sm text-gray-700">Servings: {state.recipe.servings}</p>
            <p className="text-sm text-gray-600">
              By {state.recipe.author.display_name ?? state.recipe.author.username}
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">Ingredients</h2>
            <ul className="list-disc pl-6 text-gray-800">
              {state.recipe.ingredients.map((ri) => (
                <li key={ri.id}>
                  {ri.quantity} {ri.unit} {ri.ingredient.display_name}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">Instructions</h2>
            <pre className="whitespace-pre-wrap text-gray-800">{state.recipe.instructions}</pre>
          </div>

          {owner ? (
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800"
                  href={`/recipes/${recipeId}/edit`}
                >
                  Edit
                </a>

                <button
                  type="button"
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 disabled:opacity-60"
                  disabled={actionBusy}
                  onClick={() => onToggleVisibility(!state.recipe.is_public)}
                >
                  {state.recipe.is_public ? 'Make private' : 'Publish'}
                </button>

                <button
                  type="button"
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
                  disabled={actionBusy}
                  onClick={onDelete}
                >
                  Delete
                </button>

                {authLoading ? <span className="text-sm text-gray-600">Checking session…</span> : null}
              </div>

              {actionError ? (
                <p className="text-sm text-red-600" role="alert">
                  {actionError}
                </p>
              ) : null}

              <p className="text-sm text-gray-600">
                Visibility: <span className="font-medium">{state.recipe.is_public ? 'Public' : 'Private'}</span>
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
