import { describe, expect, it } from 'vitest';
import { mapRecipeDetailStatusToUiState } from '@/lib/recipeDetailState';

describe('mapRecipeDetailStatusToUiState', () => {
  it('maps auth-related and not-found statuses', () => {
    expect(mapRecipeDetailStatusToUiState(401)).toEqual({ kind: 'auth-required' });
    expect(mapRecipeDetailStatusToUiState(403)).toEqual({ kind: 'access-denied' });
    expect(mapRecipeDetailStatusToUiState(404)).toEqual({ kind: 'not-found' });
  });

  it('maps other errors to generic error state', () => {
    expect(mapRecipeDetailStatusToUiState(500)).toEqual({ kind: 'error', message: 'Request failed (500)' });
  });
});
