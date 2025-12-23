export type RecipeDetailUiState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'not-found' }
  | { kind: 'auth-required' }
  | { kind: 'access-denied' }
  | { kind: 'ready' };

export function mapRecipeDetailStatusToUiState(status: number): RecipeDetailUiState {
  if (status === 401) return { kind: 'auth-required' };
  if (status === 403) return { kind: 'access-denied' };
  if (status === 404) return { kind: 'not-found' };
  return { kind: 'error', message: `Request failed (${status})` };
}
