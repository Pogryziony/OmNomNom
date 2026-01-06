import { useEffect, useMemo, useRef, useState } from 'react';
import type { CreateRecipeCommand, RecipeDTO, UpdateRecipeCommand } from '@/types';
import { fetchJson, makeAuthHeaders } from '@/lib/http';
import { buildCreateRecipeCommand, buildIngredientInputs, recipeDtoToFormValues } from '@/lib/recipePayload';
import { useSession } from '@/components/auth/useSession';
import LogoutButton from '@/components/auth/LogoutButton';

type Mode = 'create' | 'edit';

interface Props {
  mode: Mode;
  recipeId?: string;
}

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string };

export default function RecipeForm(props: Props) {
  const { accessToken, loading: authLoading } = useSession();

  const unitOptions = useMemo(
    () => [
      'g',
      'kg',
      'ml',
      'l',
      'tsp',
      'tbsp',
      'cup',
      'oz',
      'lb',
      'piece',
      'pinch',
      'clove',
      'slice',
    ],
    [],
  );

  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [servings, setServings] = useState(2);
  const [prepTime, setPrepTime] = useState('');
  const [ingredients, setIngredients] = useState([
    { ingredient_name: '', quantity: '1', unit: '' },
  ]);

  const [loadState, setLoadState] = useState<LoadState>({ kind: 'idle' });
  const [submitState, setSubmitState] = useState<'idle' | 'submitting'>('idle');
  const [uploadState, setUploadState] = useState<'idle' | 'uploading'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const instructionFileInputRef = useRef<HTMLInputElement>(null);

  const recipeUrl = useMemo(() => {
    if (!props.recipeId) return null;
    return `/api/recipes/${props.recipeId}`;
  }, [props.recipeId]);

  useEffect(() => {
    if (props.mode !== 'edit') return;
    if (!recipeUrl) return;
    if (authLoading) return;
    if (!accessToken) {
      setLoadState({ kind: 'error', message: 'Login required to edit recipes.' });
      return;
    }

    let cancelled = false;
    setLoadState({ kind: 'loading' });
    setErrorMessage(null);

    fetchJson<RecipeDTO>(recipeUrl, {
      headers: {
        ...makeAuthHeaders(accessToken),
      },
    })
      .then((recipe) => {
        if (cancelled) return;
        const values = recipeDtoToFormValues(recipe);
        setTitle(values.title);
        setImageUrl(values.image_url);
        setDescription(values.description);
        setInstructions(values.instructions);
        setServings(values.servings);
        setPrepTime(values.prep_time);
        setIngredients(values.ingredients.length > 0 ? values.ingredients : [{ ingredient_name: '', quantity: '1', unit: '' }]);
        setLoadState({ kind: 'idle' });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadState({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to load recipe' });
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, authLoading, props.mode, recipeUrl]);

  function addIngredientRow() {
    setIngredients((rows) => [...rows, { ingredient_name: '', quantity: '1', unit: '' }]);
  }

  function removeIngredientRow(index: number) {
    setIngredients((rows) => rows.filter((_, i) => i !== index));
  }

  function updateIngredientRow(index: number, patch: Partial<(typeof ingredients)[number]>) {
    setIngredients((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function validate(command: CreateRecipeCommand | UpdateRecipeCommand): string | null {
    if (!command.title || command.title.trim().length === 0) return 'Title is required.';
    if (!command.instructions || command.instructions.trim().length === 0) return 'Instructions are required.';
    if (!command.servings || command.servings <= 0) return 'Servings must be greater than 0.';
    if (command.description && command.description.length > 250) return 'Description cannot exceed 250 characters.';
    if (command.prep_time !== undefined && command.prep_time !== null && command.prep_time < 0) {
      return 'Preparation time must be 0 or greater.';
    }

    const isMeaningfulQuantity = (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length === 0) return false;
      // Default row value is "1"; treat that as not meaningful unless the row has a name/unit.
      return trimmed !== '1';
    };

    const isTrulyEmptyRow = (row: (typeof ingredients)[number]) =>
      row.ingredient_name.trim().length === 0 &&
      row.unit.trim().length === 0 &&
      !isMeaningfulQuantity(row.quantity);

    for (const row of ingredients) {
      if (isTrulyEmptyRow(row)) {
        continue;
      }

      if (row.ingredient_name.trim().length === 0) {
        return 'Ingredient name is required. Remove the empty ingredient row.';
      }

      if (row.unit.trim().length === 0) {
        return 'Each ingredient must have a unit.';
      }

      const normalizedQuantity = row.quantity.trim().replace(',', '.');
      const qty = Number.parseFloat(normalizedQuantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return 'Each ingredient must have a quantity greater than 0.';
      }
    }

    const builtIngredients = buildIngredientInputs(ingredients);
    if (builtIngredients.length === 0) return 'At least one ingredient is required.';

    return null;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    if (!accessToken) {
      setErrorMessage('Login required.');
      return;
    }

    const command = buildCreateRecipeCommand({
      title,
      image_url: imageUrl,
      description,
      instructions,
      servings,
      prep_time: prepTime.trim().length === 0 ? null : Number.parseInt(prepTime, 10),
      ingredients,
    });

    const validationError = validate(command);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitState('submitting');

    try {
      if (props.mode === 'create') {
        const created = await fetchJson<RecipeDTO>('/api/recipes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...makeAuthHeaders(accessToken),
          },
          body: JSON.stringify(command),
        });

        window.location.href = `/recipes/${created.id}`;
        return;
      }

      if (!props.recipeId) {
        setErrorMessage('Missing recipe id.');
        return;
      }

      const updated = await fetchJson<RecipeDTO>(`/api/recipes/${props.recipeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...makeAuthHeaders(accessToken),
        },
        body: JSON.stringify(command),
      });

      window.location.href = `/recipes/${updated.id}`;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitState('idle');
    }
  }

  async function uploadImage(file: File): Promise<string> {
    if (!accessToken) {
      throw new Error('Login required.');
    }

    const form = new FormData();
    form.set('file', file);

    const result = await fetchJson<{ url: string }>('/api/uploads/images', {
      method: 'POST',
      headers: {
        ...makeAuthHeaders(accessToken),
      },
      body: form,
    });

    return result.url;
  }

  async function onCoverFileSelected(file: File | null) {
    if (!file) return;
    setErrorMessage(null);
    setUploadState('uploading');

    try {
      const url = await uploadImage(file);
      setImageUrl(url);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadState('idle');
    }
  }

  async function onInstructionFileSelected(file: File | null) {
    if (!file) return;
    setErrorMessage(null);
    setUploadState('uploading');

    try {
      const url = await uploadImage(file);
      const snippet = `\n\n![Step photo](${url})\n`;
      setInstructions((current) => (current.trim().length === 0 ? snippet.trimStart() : `${current}${snippet}`));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadState('idle');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-x-3 text-sm">
          <a className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800" href="/">
            Home
          </a>
          <a className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800" href="/dashboard">
            Dashboard
          </a>
        </div>
        {!authLoading && accessToken ? <LogoutButton /> : null}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {props.mode === 'create' ? 'New recipe' : 'Edit recipe'}
        </h1>

        {loadState.kind === 'loading' ? <p className="text-gray-700">Loading…</p> : null}

        {loadState.kind === 'error' ? (
          <p className="text-red-600" role="alert">
            {loadState.message}
          </p>
        ) : null}

        {authLoading ? <p className="text-gray-700">Checking session…</p> : null}

        {!authLoading && !accessToken ? (
          <div className="space-y-2">
            <p className="text-gray-800">You need to log in to manage recipes.</p>
            <a className="text-indigo-600 underline" href="/login">
              Go to login
            </a>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          <datalist id="unit-options">
            {unitOptions.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              required
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="imageUrl">
              Photo URL
            </label>
            <input
              id="imageUrl"
              inputMode="url"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
              <label 
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 cursor-pointer disabled:opacity-60"
                tabIndex={0} // eslint-disable-line jsx-a11y/no-noninteractive-tabindex
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && uploadState !== 'uploading' && accessToken) {
                    e.preventDefault();
                    coverFileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadState === 'uploading' || !accessToken}
                  onChange={(e) => onCoverFileSelected(e.target.files?.[0] ?? null)}
                />
                Upload from disk
              </label>

              {uploadState === 'uploading' ? <span className="text-sm text-gray-600">Uploading…</span> : null}
            </div>
            <p className="mt-1 text-xs text-gray-600">Optional. Used for tiles and the recipe page.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              rows={6}
              maxLength={250}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional. Max 250 characters."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="servings">
              Servings
            </label>
            <input
              id="servings"
              type="number"
              min={1}
              required
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
              value={servings}
              onChange={(e) => setServings(Number.parseInt(e.target.value || '0', 10) || 0)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="prepTime">
              Preparation time (minutes)
            </label>
            <input
              id="prepTime"
              type="number"
              min={0}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="instructions">
              Instructions
            </label>
            <textarea
              id="instructions"
              required
              rows={8}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />

            <div className="mt-2 flex flex-wrap items-center gap-3">
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
              <label 
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 cursor-pointer disabled:opacity-60"
                tabIndex={0} // eslint-disable-line jsx-a11y/no-noninteractive-tabindex
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && uploadState !== 'uploading' && accessToken) {
                    e.preventDefault();
                    instructionFileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={instructionFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadState === 'uploading' || !accessToken}
                  onChange={(e) => onInstructionFileSelected(e.target.files?.[0] ?? null)}
                />
                Upload step photo
              </label>
              <span className="text-xs text-gray-600">Appends a Markdown image to the instructions.</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Ingredients</h2>
              <button
                type="button"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white"
                onClick={addIngredientRow}
              >
                Add
              </button>
            </div>

            <ul className="space-y-3">
              {ingredients.map((row, index) => (
                <li key={index} className="rounded-md border border-gray-200 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div className="md:col-span-2">
                      <label
                        className="block text-sm font-medium text-gray-700"
                        htmlFor={`ingredient-name-${index}`}
                      >
                        Name
                      </label>
                      <input
                        id={`ingredient-name-${index}`}
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                        value={row.ingredient_name}
                        onChange={(e) => updateIngredientRow(index, { ingredient_name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700" htmlFor={`ingredient-qty-${index}`}>
                        Qty
                      </label>
                      <input
                        id={`ingredient-qty-${index}`}
                        inputMode="decimal"
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                        value={row.quantity}
                        onChange={(e) => updateIngredientRow(index, { quantity: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700" htmlFor={`ingredient-unit-${index}`}>
                        Unit
                      </label>
                      <input
                        id={`ingredient-unit-${index}`}
                        list="unit-options"
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                        value={row.unit}
                        onChange={(e) => updateIngredientRow(index, { unit: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="text-sm text-red-600 underline disabled:opacity-60"
                      disabled={ingredients.length <= 1}
                      onClick={() => removeIngredientRow(index)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitState === 'submitting' || authLoading || loadState.kind === 'loading'}
            className="rounded-md bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {submitState === 'submitting' ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}
