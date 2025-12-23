import type { IngredientEntity } from '@/types';

/**
 * Normalizes ingredient name to lowercase and trimmed
 * Used for deduplication in ingredients table
 */
export function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Converts ingredient name to Title Case for display
 * Example: "fresh basil" -> "Fresh Basil"
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function getOrCreateIngredient(
  supabase: any,
  normalizedName: string,
  displayName: string
): Promise<IngredientEntity> {
  // Prefer a plain select+insert flow over upsert.
  // The `ingredients` table is immutable in MVP (no UPDATE policy), so upserts can fail
  // when they hit an existing row.
  // @ts-ignore - Database types not yet generated from schema
  const { data: existing, error: selectError } = (await supabase
    .from('ingredients')
    .select('*')
    .eq('name', normalizedName)
    .maybeSingle()) as { data: IngredientEntity | null; error: any };

  if (selectError) {
    throw new Error(`Failed to look up ingredient "${normalizedName}": ${selectError.message}`);
  }

  if (existing) {
    return existing;
  }

  // @ts-ignore - Database types not yet generated from schema
  const { data: inserted, error: insertError } = (await supabase
    .from('ingredients')
    .insert({
      name: normalizedName,
      display_name: displayName,
      category: null,
    })
    .select('*')
    .single()) as { data: IngredientEntity | null; error: any };

  if (insertError) {
    // If we raced another request and hit a uniqueness conflict, fall back to re-select.
    // @ts-ignore - Database types not yet generated from schema
    const { data: raced, error: racedSelectError } = (await supabase
      .from('ingredients')
      .select('*')
      .eq('name', normalizedName)
      .maybeSingle()) as { data: IngredientEntity | null; error: any };

    if (!racedSelectError && raced) {
      return raced;
    }

    throw new Error(`Failed to insert ingredient "${normalizedName}": ${insertError.message}`);
  }

  if (!inserted) {
    throw new Error(`No data returned from ingredient insert for "${normalizedName}"`);
  }

  return inserted;
}
