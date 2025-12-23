import { describe, expect, it } from 'vitest';
import { buildIngredientInputs } from '@/lib/recipePayload';

describe('buildIngredientInputs', () => {
  it('maps to backend-compatible ingredient payload', () => {
    const result = buildIngredientInputs([
      { ingredient_name: 'Sugar', quantity: '2', unit: 'tbsp' },
      { ingredient_name: ' Flour ', quantity: '1.5', unit: 'cup' },
    ]);

    expect(result).toEqual([
      { ingredient_name: 'Sugar', quantity: 2, unit: 'tbsp', order_index: 0 },
      { ingredient_name: 'Flour', quantity: 1.5, unit: 'cup', order_index: 1 },
    ]);
  });

  it('drops empty ingredient names', () => {
    const result = buildIngredientInputs([
      { ingredient_name: '  ', quantity: '1', unit: 'g' },
      { ingredient_name: 'Salt', quantity: '1', unit: 'tsp' },
    ]);

    expect(result).toEqual([{ ingredient_name: 'Salt', quantity: 1, unit: 'tsp', order_index: 0 }]);
  });
});
