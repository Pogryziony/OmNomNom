# Frontend Implementation Plan (MVP-only)

**Project:** OmNomNom (Astro 5 + React 19 + Tailwind 4 + Supabase)

This document decomposes the **MVP-only** frontend into **atomic, verifiable steps**.

## Scope (MVP-only)

Included:
- Auth: signup, login, logout (via Supabase client SDK)
- Private recipe CRUD UI (create, list, view, edit, delete)
- Publish toggle (private ↔ public)
- Public recipe feed (read-only; available to guests)

Explicitly excluded (post-MVP), even if backend exists:
- Recipe scaling UI
- Shopping list UI/generation
- Image upload UI
- Tags/search/filters
- Any extra pages beyond those listed

## Ground Truth: Backend endpoints used by MVP UI

- Public feed: `GET /api/recipes/public`
- My recipes list: `GET /api/recipes`
- Create recipe: `POST /api/recipes`
- View recipe: `GET /api/recipes/:id`
- Update recipe: `PUT /api/recipes/:id`
- Delete recipe: `DELETE /api/recipes/:id`
- Toggle visibility: `PATCH /api/recipes/:id/visibility`

## Cross-check notes (API contract)

The plan assumes the **implemented route handlers** are the source of truth.

- Pagination response shape (both feeds) is:
   - `{ data: T[], pagination: { page, limit, total, total_pages } }`
- `GET /api/recipes/public` (handler) supports query params:
   - `page`, `limit`, `search`, `sort` (published_at|created_at|title), `order` (asc|desc), `author` (username)
   - Note: OpenAPI currently documents only `page`, `limit`, `search` for this endpoint.
- `GET /api/recipes` (handler) supports query params:
   - `page`, `limit`, `search`, `sort` (created_at|updated_at|title), `order` (asc|desc), `is_public` (true|false)
   - Note: OpenAPI documents `search`/`sort`/`order` here, but does not currently list `is_public`.
- `GET /api/recipes/:id` auth behavior (handler):
   - Public recipes: accessible to guests
   - Private recipes: require `Authorization: Bearer <token>`; returns 401 if missing/invalid, 403 if not owner
- Ownership can be determined client-side via `recipe.user_id` (from `RecipeDTO`) compared to the current session user id.
- `PATCH /api/recipes/:id/visibility` returns `{ id, is_public, published_at, unpublished_at }`.
- `DELETE /api/recipes/:id` returns `{ id, message }`.

## UX pages (routes)

Astro pages:
- `/` public feed + entry points
- `/login`
- `/signup`
- `/dashboard` (my recipes)
- `/recipes/new`
- `/recipes/[id]`
- `/recipes/[id]/edit`

No additional pages (per MVP scope).

## Shared implementation conventions

- **Astro for routing/SSR**, React for interactive forms and client-only state.
- React islands should always use a hydration directive (e.g. `client:load`).
- Auth tokens: use Supabase client to get session and pass `Authorization: Bearer <access_token>` to protected endpoints.
- Keep recipe form fields minimal for MVP: `title`, `instructions`, `servings`, `ingredients[]`.
- Ingredient payload uses `ingredient_name` (not `name`):
  - `{ ingredient_name: string, quantity: number, unit: string, order_index: number }`

## Atomic implementation steps

### Validation toolkit (documented/configured)

- Unit/integration tests: `npm run test` (Vitest; configured `environment: 'node'`)
- Linting: `npm run lint`
- Build validation: `npm run build`
- Type-checking command:
   - ⚠ Missing or undefined in documentation: a dedicated `typecheck`/`check` npm script.
   - Available tooling in dependencies: `@astrojs/check` is present, so `npx astro check` is a valid validation command.

### Testing constraints (important)

- Vitest is configured to run in **Node environment**.
- ⚠ Missing or undefined in documentation: any browser/DOM testing setup (e.g., jsdom) and any React component testing library.
   - Result: automated tests in this plan focus on **behavioral tests in Node** (API fetch behavior, auth handling, response parsing, and route/page buildability), plus **manual verification** for interactive UI until you explicitly approve adding a browser/DOM testing tool.

### Phase 0 — Baseline plumbing

1. **Confirm global styling is wired**
    - What was implemented:
       - No new code; verify existing `src/styles/global.css` includes the single Tailwind import.
    - How it was validated:
       - Manual: run `npm run dev` and verify Tailwind utility classes apply.
       - Automated: `npm run build` must succeed.
    - Tests:
       - ⚠ Missing or undefined in documentation: automated CSS rendering tests.

2. **Confirm Supabase client module is importable**
    - What was implemented:
       - No new code; confirm `src/lib/supabase.ts` is the single client module used by frontend components.
    - How it was validated:
       - Automated: add a Vitest test that imports `src/lib/supabase.ts` (module load only).
       - Passing test proves: bundling/import shape is valid in Node and won’t immediately fail builds/tests.
    - Tests:
       - Add `tests/frontend/supabaseImport.test.ts`:
          - Asserts: importing the module does not throw.

3. **Verify env contract is documented**
    - What was implemented:
       - No new code; verify `.env.example` and README list `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`.
    - How it was validated:
       - Manual: confirm `.env.example` contains the variables.
       - Automated: optional Node-only test that checks `.env.example` contains required keys.
    - Tests:
       - Optional: `tests/frontend/envExample.test.ts`:
          - Asserts: `.env.example` contains required variable names.
          - Passing test proves: local setup instructions won’t silently drift.

### Phase 1 — Auth UI (Supabase SDK)

4. **Create `/login` page shell**
    - What was implemented:
       - `src/pages/login.astro` rendering page layout and mounting `LoginForm` with a hydration directive.
    - How it was validated:
       - Manual: navigate to `/login` and confirm form is visible.
       - Automated: `npm run build` succeeds.
    - Tests:
       - ⚠ Missing or undefined in documentation: DOM-level assertion of rendered form.

5. **Create `/signup` page shell**
    - What was implemented:
       - `src/pages/signup.astro` rendering page layout and mounting `SignupForm`.
    - How it was validated:
       - Manual: navigate to `/signup` and confirm form is visible.
       - Automated: `npm run build` succeeds.
    - Tests:
       - ⚠ Missing or undefined in documentation: DOM-level assertion of rendered form.

6. **Implement `LoginForm` (Supabase SDK)**
    - What was implemented:
       - `src/components/auth/LoginForm.tsx` calling `supabase.auth.signInWithPassword`.
       - Minimal UI states: idle, submitting, error.
    - How it was validated:
       - Manual: with a real Supabase project configured, verify:
          - valid credentials redirect to `/dashboard`
          - invalid credentials show an error
       - Automated (Node-only): factor the auth call into a small function that can be unit-tested with a mocked Supabase client.
    - Tests:
       - Add `tests/frontend/auth/loginFlow.unit.test.ts`:
          - Asserts: calls `signInWithPassword` with the provided email/password.
          - Passing test proves: auth wiring is correct (without requiring DOM).

7. **Implement `SignupForm` (Supabase SDK)**
    - What was implemented:
       - `src/components/auth/SignupForm.tsx` calling `supabase.auth.signUp`.
    - How it was validated:
       - Manual: verify success state shows “check email” message.
       - Automated (Node-only): unit-test the function that triggers `signUp` with a mocked Supabase client.
    - Tests:
       - Add `tests/frontend/auth/signupFlow.unit.test.ts`:
          - Asserts: calls `signUp` with the provided email/password.
          - Passing test proves: signup wiring is correct.

8. **Add logout action**
    - What was implemented:
       - `src/components/auth/LogoutButton.tsx` calling `supabase.auth.signOut()`.
    - How it was validated:
       - Manual: click logout and confirm session is cleared.
       - Automated (Node-only): unit-test the logout function with a mocked Supabase client.
    - Tests:
       - Add `tests/frontend/auth/logoutFlow.unit.test.ts`:
          - Asserts: calls `signOut`.
          - Passing test proves: logout behavior is triggered.

9. **Add minimal session state utility**
    - What was implemented:
       - A small session utility/hook that exposes current session and reacts to auth state changes.
    - How it was validated:
       - Manual: session state updates after login/logout.
       - Automated (Node-only): test that an auth change callback updates stored session state (mock `onAuthStateChange`).
    - Tests:
       - Add `tests/frontend/auth/sessionState.unit.test.ts`.

### Phase 2 — Public feed (guest accessible)

10. **Create/confirm `/` page mounts public feed UI**
    - What was implemented:
       - `src/pages/index.astro` mounts a `PublicFeed` React island.
    - How it was validated:
       - Manual: open `/` as a guest; verify the feed UI is present.
       - Automated: `npm run build` succeeds.
    - Tests:
       - ⚠ Missing or undefined in documentation: DOM-level feed rendering tests.

11. **Implement public feed data fetch + mapping**
    - What was implemented:
       - `PublicFeed` fetches `GET /api/recipes/public` and handles the paginated response wrapper.
    - How it was validated:
       - Automated (Node-only): a unit test verifies that the response parsing expects `{ data, pagination }`.
       - Manual: with seeded public recipes, the feed shows recipe cards.
    - Tests:
       - Add `tests/frontend/recipes/publicFeedParsing.unit.test.ts`:
          - Asserts: given a mock response body, the mapping produces expected card view-models.
          - Passing test proves: frontend won’t break when pagination metadata exists.

12. **Add pagination controls**
    - What was implemented:
       - Pagination state (`page`, `limit`) and UI controls for next/prev.
    - How it was validated:
       - Automated (Node-only): unit test asserts querystring builder uses `page` and `limit`.
       - Manual: navigate across pages; controls disable at bounds.
    - Tests:
       - Add `tests/frontend/http/queryString.unit.test.ts`:
          - Asserts: page/limit/search become expected URL query params.
          - Passing test proves: pagination requests are formed correctly.

13. **Link to recipe detail**
   - Clicking a public recipe goes to `/recipes/[id]`.
   - Acceptance: navigation works and shows detail page.

### Phase 3 — Authenticated recipes dashboard

14. **Create `/dashboard` page shell**
   - File: `src/pages/dashboard.astro`
   - Mount `MyRecipes` React island.
   - Acceptance: page loads.

15. **Implement “My recipes” list fetch + auth header**
    - What was implemented:
       - Dashboard fetches `GET /api/recipes` and includes `Authorization: Bearer <token>`.
       - Handles paginated wrapper.
    - How it was validated:
       - Automated (Node-only): unit test verifies Authorization header injection when token exists.
       - Manual: logged-in user sees list; logged-out user is prompted to log in.
    - Tests:
       - Add `tests/frontend/http/authHeaders.unit.test.ts`:
          - Asserts: token -> `Authorization` header.
          - Passing test proves: protected calls will authenticate.

16. **Add “New recipe” CTA**
   - Link to `/recipes/new`.
   - Acceptance: navigation works.

### Phase 4 — Recipe create/edit form

17. **Create `/recipes/new` page shell**
   - File: `src/pages/recipes/new.astro`
   - Mount `RecipeForm` with mode = create.
   - Acceptance: page loads.

18. **Create `/recipes/[id]/edit` page shell**
   - File: `src/pages/recipes/[id]/edit.astro`
   - Mount `RecipeForm` with mode = edit and recipe id from params.
   - Acceptance: page loads.

19. **Implement `RecipeForm` base UI (no networking yet)**
   - File: `src/components/recipes/RecipeForm.tsx`
   - Fields: title, instructions, servings.
   - Ingredients editor: list of rows with name, quantity, unit; supports add/remove.
    - What was implemented:
       - Controlled inputs and local validation rules for required fields.
    - How it was validated:
       - Manual: add/remove ingredients and confirm payload preview/submit enabled logic.
       - Automated (Node-only): unit tests for payload builder and validation function.
    - Tests:
       - Add `tests/frontend/recipes/recipePayload.unit.test.ts`:
          - Asserts: ingredients map to `{ ingredient_name, quantity, unit, order_index }`.
          - Passing test proves: backend-compatible payload is produced.

20. **Wire create recipe API**
    - What was implemented:
       - Submit handler calls `POST /api/recipes` with bearer token.
    - How it was validated:
       - Automated (Node-only): unit test verifies endpoint path, method, and Authorization header.
       - Manual: successful create navigates to `/recipes/[id]`.
    - Tests:
       - Add `tests/frontend/recipes/createRecipeRequest.unit.test.ts`:
          - Passing test proves: create requests are correctly formed.

21. **Wire load recipe for edit**
   - On mount (edit): `GET /api/recipes/:id` with token (or none if public is allowed).
   - Populate form state.
   - Acceptance: form shows existing data.

22. **Wire update recipe API**
   - On submit (edit): `PUT /api/recipes/:id` with token.
   - Acceptance: successful update redirects to `/recipes/[id]`.

### Phase 5 — Recipe detail + publish toggle + delete

23. **Create `/recipes/[id]` page shell**
   - File: `src/pages/recipes/[id].astro`
   - Mount `RecipeDetail` island.
   - Acceptance: page loads.

24. **Implement `RecipeDetail` fetch + render**
   - File: `src/components/recipes/RecipeDetail.tsx`
   - Fetch `GET /api/recipes/:id`.
   - If a session exists, include `Authorization` header; otherwise fetch without auth (works for public recipes).
   - If response is 401, show a login call-to-action (private recipe).
   - If response is 403, show an access denied state.
   - Render title, servings, ingredients, instructions.
    - How it was validated:
       - Automated (Node-only): unit test asserts error handling for 401/403/404 response codes.
       - Manual: open a public recipe as guest; open a private recipe as guest (expect 401 CTA).
    - Tests:
       - Add `tests/frontend/http/httpErrors.unit.test.ts`:
          - Asserts: status code -> UI state mapping (as plain functions).
          - Passing test proves: correct auth/permission UX decisions.

25. **Add owner-only actions UI**
    - Determine ownership by comparing `RecipeDTO.user_id` to the session user id.
   - Actions: Edit link, Delete button, Visibility toggle.
    - How it was validated:
       - Automated (Node-only): unit test validates the `isOwner(recipeUserId, sessionUserId)` helper.
       - Manual: log in as owner vs another user.
    - Tests:
       - Add `tests/frontend/recipes/ownership.unit.test.ts`.

26. **Wire visibility toggle**
   - Call `PATCH /api/recipes/:id/visibility` with `{ is_public }` and token.
   - Update UI state from response `{ id, is_public, published_at, unpublished_at }`.
    - How it was validated:
       - Automated (Node-only): unit test verifies request method/path/body and response parsing.
       - Manual: toggle and confirm it updates UI state.
    - Tests:
       - Add `tests/frontend/recipes/visibilityToggle.unit.test.ts`.

27. **Wire delete recipe**
   - Call `DELETE /api/recipes/:id` with token.
   - On success: navigate back to `/dashboard`.
   - Acceptance: recipe disappears from dashboard list after refresh.
    - How it was validated:
       - Automated (Node-only): unit test verifies delete request formation and parses `{ id, message }`.
       - Manual: delete a recipe and confirm redirect.
    - Tests:
       - Add `tests/frontend/recipes/deleteRecipe.unit.test.ts`.

### Phase 6 — Minimal polish + guardrails (still MVP)

28. **Add consistent error handling**
   - Show API error message for validation/authorization issues.
   - Acceptance: no silent failures.

29. **Loading/empty states**
   - Public feed, dashboard list, detail, form submit.
   - Acceptance: obvious feedback during fetch/submit.

30. **Accessibility basics**
   - Proper labels for inputs, button type attributes, focus order.
   - Acceptance: keyboard navigation works for forms.

## Non-goals (do not implement)

- Shopping list pages/components
- Scaling UI (even though API exists)
- Any upload/image UI
- Any search/filter/tag UI

## Suggested verification checklist

- Guest can browse `/` and open `/recipes/:id` for public recipes.
- Logged-in user can create/edit/delete recipes.
- Logged-in user can toggle recipe public/private and see it appear/disappear from public feed.
- No post-MVP UI is exposed.

## Optional: request for permission (only if you want stronger automated UI testing)

⚠ Missing or undefined in documentation: a browser/DOM UI testing setup.

If you want fully automated UI behavior tests for React components (forms, ingredient editor interactions, button clicks), we would need explicit approval to add a DOM testing solution compatible with Vitest (e.g., a jsdom environment and a React component testing library). Without approval, this plan limits automation to Node-validatable behavior and build checks.
