import type { CreateRecipeCommand, RecipeIngredientInput, RecipeDTO } from '@/types';

export interface IngredientRowInput {
  ingredient_name: string;
  quantity: string;
  unit: string;
}

export function buildIngredientInputs(rows: IngredientRowInput[]): RecipeIngredientInput[] {
  const mapped = rows
    .map((row) => {
      const ingredientName = row.ingredient_name.trim();
      const unit = row.unit.trim();
      const normalizedQuantity = row.quantity.trim().replace(',', '.');
      const quantity = Number.parseFloat(normalizedQuantity);

      return {
        ingredient_name: ingredientName,
        quantity: Number.isFinite(quantity) ? quantity : 0,
        unit,
      };
    })
    .filter((row) => row.ingredient_name.length > 0);

  return mapped.map((row, orderIndex) => ({
    ...row,
    order_index: orderIndex,
  }));
}

export function buildCreateRecipeCommand(input: {
  title: string;
  instructions: string;
  servings: number;
  prep_time?: number | null;
  image_url?: string;
  description?: string;
  ingredients: IngredientRowInput[];
}): CreateRecipeCommand {
  return {
    title: input.title.trim(),
    instructions: input.instructions.trim(),
    servings: input.servings,
    prep_time: input.prep_time ?? null,
    image_url: input.image_url?.trim() ? input.image_url.trim() : null,
    description: input.description?.trim() ? input.description.trim() : null,
    ingredients: buildIngredientInputs(input.ingredients),
  };
}

export function recipeDtoToFormValues(recipe: RecipeDTO): {
  title: string;
  instructions: string;
  servings: number;
  prep_time: string;
  image_url: string;
  description: string;
  ingredients: IngredientRowInput[];
} {
  return {
    title: recipe.title,
    instructions: recipe.instructions,
    servings: recipe.servings,
    prep_time: recipe.prep_time === null ? '' : String(recipe.prep_time),
    image_url: recipe.image_url ?? '',
    description: recipe.description ?? '',
    ingredients: recipe.ingredients.map((ri) => ({
      ingredient_name: ri.ingredient.display_name,
      quantity: String(ri.quantity),
      unit: ri.unit,
    })),
  };
}
