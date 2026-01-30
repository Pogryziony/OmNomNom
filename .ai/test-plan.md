## Playwright Integration Test Plan (Detailed Cases)

### Scope
UI tests for:
1) Login
2) Creation of recipe
3) Change of visibility
4) Edit of recipe
5) Delete of recipe

### Global Prerequisites
- Playwright configured with baseURL (e.g., http://localhost:4321).
- Test user exists and credentials are available via env:
  - E2E_USER_EMAIL
  - E2E_USER_PASSWORD
- Clean test data: any leftover recipes created by prior runs should be removed (or use unique titles per run).

---

### Test Case 1: Login
**Description**
Verify that a valid user can log in and is taken to the dashboard.

**Prerequisites**
- Valid test user credentials available in env.
- App is running and reachable.

**Steps & Expected Results**
1. **Step:** Navigate to `/login`.
	**Expected:** Login form is visible with email and password inputs and a submit button.
2. **Step:** Enter valid credentials and submit the form.
	**Expected:** User is redirected to `/dashboard`.
3. **Step:** Observe the dashboard page header and actions.
	**Expected:** “My recipes” header and “New recipe” button are visible.

---

### Test Case 2: Create Recipe
**Description**
Create a new recipe and verify it appears on the recipe detail page.

**Prerequisites**
- User is logged in (reuse login helper).
- Unique recipe title available (timestamp suffix).

**Steps & Expected Results**
1. **Step:** Navigate to `/recipes/new`.
	**Expected:** Recipe form loads with title, servings, instructions, and description fields.
2. **Step:** Fill in title, servings, prep time, description (<=250 chars), instructions.
	**Expected:** Inputs accept values and remain visible (no validation errors shown).
3. **Step:** Submit the form.
	**Expected:** User is redirected to the recipe detail page for the new recipe.
4. **Step:** Verify detail page content.
	**Expected:** Title, servings, and prep time are displayed. Instructions text is visible.

---

### Test Case 3: Change Visibility
**Description**
Toggle recipe visibility and verify public feed behavior.

**Prerequisites**
- User is logged in.
- A recipe exists (create one within the test or reuse from Test Case 2).

**Steps & Expected Results**
1. **Step:** Open the recipe detail page for the target recipe.
	**Expected:** Visibility control is present (public/private toggle or checkbox).
2. **Step:** Set visibility to **Public** and save/update.
	**Expected:** Success feedback appears, and the recipe remains on the detail page.
3. **Step:** Navigate to `/` (public feed).
	**Expected:** The recipe appears in the public feed list.
4. **Step:** Return to the recipe detail page and set visibility to **Private**.
	**Expected:** Success feedback appears.
5. **Step:** Refresh `/` (public feed).
	**Expected:** The recipe no longer appears in the public feed list.

---

### Test Case 4: Edit Recipe
**Description**
Edit an existing recipe and verify updates persist.

**Prerequisites**
- User is logged in.
- A recipe exists.

**Steps & Expected Results**
1. **Step:** Navigate to the recipe detail page and click “Edit”.
	**Expected:** Edit form loads with existing values prefilled.
2. **Step:** Update the prep time and description.
	**Expected:** Fields reflect the new values.
3. **Step:** Submit the form.
	**Expected:** Redirected back to the recipe detail page.
4. **Step:** Verify updated values on detail page.
	**Expected:** New prep time and description are displayed.

---

### Test Case 5: Delete Recipe
**Description**
Delete an existing recipe and verify it is removed from the dashboard list.

**Prerequisites**
- User is logged in.
- A recipe exists (preferably created within the test for isolation).

**Steps & Expected Results**
1. **Step:** Navigate to the recipe detail page and click “Delete”.
	**Expected:** A confirmation prompt appears (if implemented).
2. **Step:** Confirm deletion.
	**Expected:** User is redirected to `/dashboard` with a success state.
3. **Step:** Verify dashboard list.
	**Expected:** The deleted recipe no longer appears in the list.

---

### Notes
- Prefer stable selectors via `data-testid` attributes if available - if not add them.
- Use a single logged-in session per test file to reduce overhead.
- Cleanup: if a test fails after creation, attempt to delete the recipe in a `finally` block.
