# User Stories & Acceptance Criteria

**Project:** OmNomNom - Recipe Management Application  
**Version:** 1.0  
**Date:** October 24, 2025

---

## Overview

This document expands the high-level user stories from the PRD into detailed, testable Acceptance Criteria (AC). Each user story includes specific conditions that must be met for the feature to be considered complete.

**Format:**

- **User Story**: As a [user type], I want to [action] so that [benefit]
- **Acceptance Criteria**: Specific, testable conditions
- **Test Scenarios**: Example test cases

---

## Epic 1: Authentication & Onboarding

### US-1.1: Browse Public Feed as Guest

**User Story:**  
As a new visitor, I want to browse the public recipe feed without creating an account so that I can evaluate the platform before committing to sign up.

**Acceptance Criteria:**

**AC-1.1.1:** Guest Access to Home Page

- GIVEN I am not logged in
- WHEN I navigate to the home page (`/`)
- THEN I should see the public recipe feed
- AND I should see recipe cards for all public recipes
- AND I should see [Login] and [Sign Up] buttons in the header

**AC-1.1.2:** Recipe Card Display

- GIVEN I am viewing the public feed as a guest
- WHEN I see recipe cards
- THEN each card should display:
  - Recipe title
  - Recipe image (or placeholder if none)
  - Author username (e.g., "By: @username")
  - Publication date
  - Tags/categories (if any)

**AC-1.1.3:** View Recipe Details

- GIVEN I am a guest on the home page
- WHEN I click on a recipe card
- THEN I should navigate to the recipe detail page (`/recipe/[id]`)
- AND I should see the full recipe (ingredients, instructions, etc.)
- AND I should NOT see "Edit" or "Delete" buttons

**AC-1.1.4:** Limited Actions for Guests

- GIVEN I am a guest viewing a recipe
- WHEN I try to access authenticated features
- THEN I should see call-to-action prompts to sign up
- AND I should NOT be able to:
  - Create recipes
  - Add to shopping list
  - Edit any recipes

**Test Scenarios:**

1. Open browser in incognito mode → Navigate to `/` → Verify public feed displays
2. Click recipe card → Verify recipe detail page loads
3. Try to access `/dashboard` → Verify redirect to `/login`

---

### US-1.2: User Registration

**User Story:**  
As a home cook, I want to create an account with my email and password so that I can start storing my personal recipes securely.

**Acceptance Criteria:**

**AC-1.2.1:** Signup Form Display

- GIVEN I am on the signup page (`/signup`)
- WHEN the page loads
- THEN I should see a signup form with fields:
  - Username (text input)
  - Email (email input)
  - Password (password input)
  - Confirm Password (password input)
  - Terms & Privacy checkbox
  - [Sign Up] button

**AC-1.2.2:** Form Validation

- GIVEN I am filling out the signup form
- WHEN I submit with invalid data
- THEN I should see appropriate error messages:
  - Username: "Username must be 3-20 characters"
  - Email: "Invalid email format"
  - Password: "Password must be at least 8 characters with 1 uppercase and 1 number"
  - Confirm Password: "Passwords do not match"
  - Terms: "You must agree to Terms & Privacy"

**AC-1.2.3:** Successful Registration

- GIVEN I have filled out the signup form correctly
- WHEN I click [Sign Up]
- THEN I should see a success message or loading indicator
- AND my account should be created in the database
- AND a profile record should be auto-created
- AND I should be redirected to `/dashboard`

**AC-1.2.4:** Duplicate Account Prevention

- GIVEN an account with email "<test@example.com>" already exists
- WHEN I try to sign up with the same email
- THEN I should see error: "Email already registered"
- AND the form should not submit

**AC-1.2.5:** Password Strength Indicator

- GIVEN I am typing in the password field
- WHEN I enter characters
- THEN I should see real-time password strength feedback
- AND suggestions for improvement (e.g., "Add uppercase letter")

**Test Scenarios:**

1. Valid signup → Verify account created → Verify redirected to dashboard
2. Invalid email format → Verify error displayed
3. Mismatched passwords → Verify error displayed
4. Duplicate email → Verify error displayed
5. Weak password → Verify strength indicator shows "Weak"

---

### US-1.3: User Login

**User Story:**  
As a registered user, I want to log in with my email and password so that I can access my private recipes.

**Acceptance Criteria:**

**AC-1.3.1:** Login Form Display

- GIVEN I am on the login page (`/login`)
- WHEN the page loads
- THEN I should see a login form with:
  - Email input field
  - Password input field
  - [Login] button
  - "Forgot password?" link
  - "Don't have an account? Sign Up" link

**AC-1.3.2:** Successful Login

- GIVEN I have a valid account
- WHEN I enter correct credentials and click [Login]
- THEN I should be authenticated
- AND I should be redirected to `/dashboard`
- AND I should see my username in the header

**AC-1.3.3:** Invalid Credentials

- GIVEN I enter incorrect email or password
- WHEN I click [Login]
- THEN I should see error: "Invalid email or password"
- AND I should remain on the login page
- AND the form should be cleared (password field)

**AC-1.3.4:** Session Persistence

- GIVEN I have logged in successfully
- WHEN I close the browser and reopen
- THEN I should still be logged in (session persists)
- AND I should be able to access protected pages without logging in again

**AC-1.3.5:** Redirect After Login

- GIVEN I tried to access `/recipes/new` without being logged in
- WHEN I was redirected to `/login`
- AND I successfully log in
- THEN I should be redirected back to `/recipes/new` (original destination)

**Test Scenarios:**

1. Valid login → Verify redirect to dashboard
2. Invalid password → Verify error message
3. Non-existent email → Verify error message
4. Close and reopen browser → Verify session persists
5. Access protected page → Redirect to login → Login → Verify redirect to original page

---

### US-1.4: User Logout

**User Story:**  
As a logged-in user, I want to log out so that I can secure my account when using a shared device.

**Acceptance Criteria:**

**AC-1.4.1:** Logout Button Display

- GIVEN I am logged in
- WHEN I view the header
- THEN I should see a user dropdown menu
- AND I should see "Logout" option in the dropdown

**AC-1.4.2:** Successful Logout

- GIVEN I am logged in
- WHEN I click "Logout"
- THEN my session should be terminated
- AND I should be redirected to the home page (`/`)
- AND I should see [Login] and [Sign Up] buttons (not logged in state)

**AC-1.4.3:** Session Cleared

- GIVEN I have logged out
- WHEN I try to access `/dashboard`
- THEN I should be redirected to `/login`
- AND I should NOT be able to access any authenticated pages

**Test Scenarios:**

1. Click Logout → Verify redirect to home page
2. After logout, try to access dashboard → Verify redirect to login
3. After logout, verify session cookie cleared (DevTools)

---

## Epic 2: Recipe Management (CRUD)

### US-2.1: Create Private Recipe

**User Story:**  
As a logged-in user, I want to create a new private recipe with ingredients and instructions so that I can digitally organize my family recipes in one place.

**Acceptance Criteria:**

**AC-2.1.1:** Access Create Recipe Page

- GIVEN I am logged in
- WHEN I click [+ Create New Recipe] on the dashboard
- THEN I should navigate to `/recipes/new`
- AND I should see the recipe creation form

**AC-2.1.2:** Form Fields Display

- GIVEN I am on the create recipe page
- WHEN the page loads
- THEN I should see form sections:
  - Basic Information (Title, Description, Servings, Prep Time, Cook Time, Image Upload)
  - Ingredients (Dynamic rows with Quantity, Unit, Ingredient Name, Delete button)
  - Instructions (Textarea)
  - Visibility (Public/Private toggle, default: Private)
  - Action buttons (Cancel, Save Recipe)

**AC-2.1.3:** Dynamic Ingredient Rows

- GIVEN I am filling out the ingredients section
- WHEN I click [+ Add Ingredient]
- THEN a new ingredient row should appear
- AND I should be able to add multiple ingredients
- WHEN I click [X] on an ingredient row
- THEN that row should be removed

**AC-2.1.4:** Form Validation

- GIVEN I try to submit the form with missing required fields
- WHEN I click [Save Recipe]
- THEN I should see validation errors:
  - "Title is required"
  - "At least one ingredient is required"
  - "Instructions are required"
  - "Servings must be greater than 0"

**AC-2.1.5:** Successful Recipe Creation

- GIVEN I have filled out all required fields correctly
- WHEN I click [Save Recipe]
- THEN the recipe should be created in the database
- AND I should see a success message
- AND I should be redirected to `/dashboard` or `/recipe/[new-id]`
- AND the recipe should be marked as private by default

**AC-2.1.6:** Image Upload

- GIVEN I am creating a recipe
- WHEN I click [Choose image]
- THEN I should be able to select an image file (jpg/png)
- AND a preview should display
- AND the image should be uploaded to Supabase storage
- IF the file exceeds 5MB
- THEN I should see error: "Image must be less than 5MB"

**Test Scenarios:**

1. Fill out complete form → Save → Verify recipe created
2. Submit with empty title → Verify error displayed
3. Upload 10MB image → Verify error displayed
4. Add 5 ingredients → Delete 2 → Save → Verify correct ingredients saved
5. Leave as Private → Save → Verify recipe not visible on public feed

---

### US-2.2: View Own Recipes

**User Story:**  
As a logged-in user, I want to view all my private recipes in a list so that I can quickly find the recipe I want to cook tonight.

**Acceptance Criteria:**

**AC-2.2.1:** Dashboard Display

- GIVEN I am logged in
- WHEN I navigate to `/dashboard`
- THEN I should see a list of all my recipes
- AND each recipe should display as a card with:
  - Recipe title
  - Thumbnail image (or placeholder)
  - Servings count
  - Privacy status (Private or Public badge)
  - Creation date
  - Action buttons (View, Edit, Delete, Toggle Public)

**AC-2.2.2:** Empty State

- GIVEN I am logged in and have no recipes
- WHEN I visit the dashboard
- THEN I should see an empty state message:
  - "📝 No recipes yet"
  - "Create your first recipe to get started!"
  - [+ Create Recipe] button

**AC-2.2.3:** Search Recipes

- GIVEN I have multiple recipes on my dashboard
- WHEN I type in the search field
- THEN recipes should be filtered by title in real-time
- AND only matching recipes should display

**AC-2.2.4:** Filter by Privacy

- GIVEN I have both private and public recipes
- WHEN I select [Filter: Private]
- THEN only private recipes should display
- WHEN I select [Filter: Public]
- THEN only public recipes should display

**AC-2.2.5:** View Recipe Details

- GIVEN I am on my dashboard
- WHEN I click [View] on a recipe card
- THEN I should navigate to `/recipe/[id]`
- AND I should see the full recipe details

**Test Scenarios:**

1. Create 3 recipes → Visit dashboard → Verify all 3 displayed
2. Search for "cake" → Verify only recipes with "cake" in title displayed
3. Filter by Private → Verify only private recipes shown
4. No recipes → Verify empty state displayed

---

### US-2.3: Edit Recipe

**User Story:**  
As a logged-in user, I want to edit an existing recipe to fix a typo in the ingredients so that my recipe remains accurate.

**Acceptance Criteria:**

**AC-2.3.1:** Access Edit Page

- GIVEN I am viewing my recipe on the dashboard or detail page
- WHEN I click [Edit]
- THEN I should navigate to `/recipes/[id]/edit`
- AND the form should be pre-populated with existing recipe data

**AC-2.3.2:** Edit Form Pre-population

- GIVEN I am on the edit recipe page
- WHEN the page loads
- THEN all fields should be filled with current values:
  - Title, description, servings, times
  - All existing ingredients in rows
  - Instructions
  - Current image preview
  - Current visibility status

**AC-2.3.3:** Successful Update

- GIVEN I have modified recipe fields
- WHEN I click [Save Recipe]
- THEN the recipe should be updated in the database
- AND I should see success message: "Recipe updated successfully"
- AND I should be redirected to `/recipe/[id]`
- AND the `updated_at` timestamp should be updated

**AC-2.3.4:** Ownership Verification

- GIVEN I try to access `/recipes/[other-user-recipe-id]/edit`
- WHEN the page loads
- THEN I should see 403 Forbidden error
- OR I should be redirected to `/dashboard`
- AND I should NOT be able to edit another user's recipe

**AC-2.3.5:** Cancel Edit

- GIVEN I am editing a recipe
- WHEN I click [Cancel]
- THEN I should see a confirmation dialog: "Discard changes?"
- WHEN I confirm
- THEN I should navigate back to `/recipe/[id]` or `/dashboard`
- AND no changes should be saved

**Test Scenarios:**

1. Edit recipe title → Save → Verify updated on detail page
2. Add new ingredient → Save → Verify ingredient added
3. Remove ingredient → Save → Verify ingredient deleted
4. Try to edit another user's recipe → Verify access denied
5. Click Cancel → Verify confirmation dialog → Confirm → Verify no changes saved

---

### US-2.4: Delete Recipe

**User Story:**  
As a logged-in user, I want to delete a recipe I no longer use so that my collection stays organized and clutter-free.

**Acceptance Criteria:**

**AC-2.4.1:** Delete Button Display

- GIVEN I am viewing my recipe
- WHEN I see the recipe card on dashboard or detail page
- THEN I should see a [Delete] button

**AC-2.4.2:** Confirmation Dialog

- GIVEN I click [Delete] on a recipe
- WHEN the button is clicked
- THEN I should see a confirmation dialog:
  - "Are you sure you want to delete this recipe?"
  - "This action cannot be undone."
  - [Cancel] [Delete] buttons

**AC-2.4.3:** Successful Deletion

- GIVEN I confirm deletion
- WHEN I click [Delete] in the confirmation dialog
- THEN the recipe should be deleted from the database
- AND all associated ingredients should be deleted (cascade)
- AND I should see success message: "Recipe deleted successfully"
- AND I should be redirected to `/dashboard`
- AND the recipe should no longer appear in my list

**AC-2.4.4:** Cancel Deletion

- GIVEN I click [Delete] and see the confirmation dialog
- WHEN I click [Cancel]
- THEN the dialog should close
- AND no deletion should occur
- AND I should remain on the current page

**AC-2.4.5:** Ownership Verification

- GIVEN I try to delete another user's recipe
- WHEN I attempt the deletion
- THEN I should see 403 Forbidden error
- AND the recipe should NOT be deleted

**Test Scenarios:**

1. Click Delete → Cancel → Verify recipe still exists
2. Click Delete → Confirm → Verify recipe deleted and removed from dashboard
3. Delete public recipe → Verify removed from public feed
4. Try to delete another user's recipe → Verify access denied

---

## Epic 3: Public Sharing

### US-3.1: Publish Recipe to Public Feed

**User Story:**  
As a logged-in user, I want to toggle a recipe from private to public so that I can share my best dish with the cooking community.

**Acceptance Criteria:**

**AC-3.1.1:** Toggle Button Display

- GIVEN I am viewing my own recipe
- WHEN I see the recipe detail page or edit form
- THEN I should see a visibility toggle control
- AND it should clearly show current status: "Private" or "Public"

**AC-3.1.2:** First-Time Publication Confirmation

- GIVEN I am toggling a recipe to public for the first time
- WHEN I click the toggle to "Public"
- THEN I should see a confirmation dialog:
  - "Make this recipe public?"
  - "Anyone will be able to see this recipe on the public feed."
  - [Cancel] [Make Public] buttons

**AC-3.1.3:** Successful Publication

- GIVEN I confirm making recipe public
- WHEN the request completes
- THEN the recipe `is_public` field should be set to `true`
- AND the `published_at` timestamp should be set
- AND I should see success message: "Recipe published successfully"
- AND the recipe should appear on the public feed

**AC-3.1.4:** Public Badge Display

- GIVEN I have published a recipe
- WHEN I view my dashboard
- THEN the recipe card should display a "Public" badge
- AND I should see publication date

**AC-3.1.5:** Revert to Private

- GIVEN I have a public recipe
- WHEN I toggle it back to "Private"
- THEN the recipe should be removed from the public feed
- AND `is_public` should be set to `false`
- AND `unpublished_at` timestamp should be set
- AND I should see success message: "Recipe is now private"

**Test Scenarios:**

1. Toggle private recipe to public → Verify appears on public feed
2. Toggle public recipe to private → Verify removed from public feed
3. Check published_at timestamp → Verify set correctly
4. View recipe as guest → Verify public recipe visible

---

### US-3.2: View Public Recipe Feed

**User Story:**  
As any user (logged in or guest), I want to see all public recipes in a feed so that I can discover new cooking ideas from other users.

**Acceptance Criteria:**

**AC-3.2.1:** Public Feed Display

- GIVEN I navigate to the home page (`/`)
- WHEN the page loads
- THEN I should see all public recipes in chronological order (newest first)
- AND each recipe should display as a card

**AC-3.2.2:** Recipe Card Information

- GIVEN I am viewing the public feed
- WHEN I see recipe cards
- THEN each card should show:
  - Recipe title
  - Author username (e.g., "By: @username")
  - Publication date
  - Recipe image (or placeholder)
  - Tags/categories (if any)

**AC-3.2.3:** Pagination

- GIVEN there are more than 20 public recipes
- WHEN I scroll to the bottom of the feed
- THEN I should see pagination controls
- AND I should be able to navigate to next page
- AND each page should show 20 recipes

**AC-3.2.4:** Search Public Recipes

- GIVEN I am on the home page
- WHEN I type in the search bar
- THEN recipes should be filtered by title or ingredients
- AND only matching recipes should display

**AC-3.2.5:** Filter by Tags

- GIVEN I am on the home page
- WHEN I click a tag filter (e.g., "Dessert")
- THEN only recipes with that tag should display
- AND I should be able to clear filters

**AC-3.2.6:** View Public Recipe Details

- GIVEN I am viewing the public feed (as guest or logged-in user)
- WHEN I click on a recipe card
- THEN I should navigate to `/recipe/[id]`
- AND I should see the full recipe details
- AND I should NOT see [Edit] or [Delete] buttons (unless I'm the owner)

**Test Scenarios:**

1. Publish recipe → Visit home page as guest → Verify recipe appears
2. Create 25 public recipes → Verify pagination works
3. Search for "pasta" → Verify only matching recipes shown
4. Click "Vegetarian" tag → Verify only vegetarian recipes shown

---

## Epic 4: Recipe Scaling

### US-4.1: Adjust Recipe Servings

**User Story:**  
As a logged-in user viewing my recipe, I want to adjust the serving size from 4 to 8 so that I can see the scaled ingredient quantities for a dinner party without manually calculating.

**Acceptance Criteria:**

**AC-4.1.1:** Scaler Component Display

- GIVEN I am viewing a recipe detail page
- WHEN the page loads
- THEN I should see a servings adjuster component
- AND it should display the original servings number
- AND it should have [<] and [>] buttons
- AND it should have a [Reset to Original] button

**AC-4.1.2:** Increase Servings

- GIVEN I am viewing a recipe with 4 servings
- WHEN I click the [>] button
- THEN the servings should increase to 5
- AND all ingredient quantities should update in real-time
- AND the scaling should be accurate (e.g., 2 cups → 2.5 cups)

**AC-4.1.3:** Decrease Servings

- GIVEN I am viewing a recipe with 4 servings
- WHEN I click the [<] button
- THEN the servings should decrease to 3
- AND all ingredient quantities should update accordingly

**AC-4.1.4:** Minimum Servings

- GIVEN I am viewing a recipe with 1 serving
- WHEN I try to click [<] button
- THEN the button should be disabled
- AND servings should not go below 1

**AC-4.1.5:** Reset to Original

- GIVEN I have scaled a recipe to 8 servings
- WHEN I click [Reset to Original]
- THEN servings should return to original value (4)
- AND all ingredient quantities should reset

**AC-4.1.6:** Scaling Accuracy

- GIVEN I scale a recipe by 1.5x (4 → 6 servings)
- WHEN I view ingredient quantities
- THEN quantities should be multiplied by 1.5
- AND fractional quantities should display nicely (e.g., 1.5 → 1½)
- AND rounding should be to 2 decimal places

**AC-4.1.7:** Non-Numeric Quantities

- GIVEN a recipe has ingredients like "a pinch of salt" or "to taste"
- WHEN I scale the recipe
- THEN these text-based quantities should NOT be scaled
- AND they should display with "*Not scaled" notation

**AC-4.1.8:** State Persistence

- GIVEN I have scaled a recipe
- WHEN I refresh the page
- THEN the recipe should reset to original servings
- AND scaled quantities should not persist

**Test Scenarios:**

1. Scale 4 → 8 servings → Verify all quantities doubled
2. Scale 4 → 2 servings → Verify all quantities halved
3. Scale to 6 servings (1.5x) → Verify fractional display (1½ cups)
4. Click Reset → Verify returns to original
5. Refresh page after scaling → Verify resets to original
6. Recipe with "pinch of salt" → Scale → Verify "pinch" unchanged

---

## Epic 5: Shopping List

### US-5.1: Generate Shopping List from Recipes

**User Story:**  
As a logged-in user, I want to select multiple recipes and generate a combined shopping list so that I can efficiently grocery shop for the week without duplicate items.

**Acceptance Criteria:**

**AC-5.1.1:** Recipe Selection Interface

- GIVEN I am on the shopping list page (`/shopping-list`)
- WHEN the page loads
- THEN I should see a list of my recipes with checkboxes
- AND I should be able to select multiple recipes

**AC-5.1.2:** Generate Button State

- GIVEN I am on the shopping list page
- WHEN no recipes are selected
- THEN the [Generate List] button should be disabled
- WHEN at least one recipe is selected
- THEN the [Generate List] button should be enabled

**AC-5.1.3:** Successful List Generation

- GIVEN I have selected 2 recipes
- WHEN I click [Generate List]
- THEN a shopping list should be generated
- AND ingredients from both recipes should be aggregated
- AND duplicate ingredients (same name + unit) should be combined
- AND quantities should be summed correctly

**AC-5.1.4:** Ingredient Aggregation Logic

- GIVEN Recipe A has "2 cups flour" and Recipe B has "1 cup flour"
- WHEN I generate a shopping list
- THEN I should see "3 cups flour" (combined)
- GIVEN Recipe A has "2 cups milk" and Recipe B has "200ml milk"
- WHEN I generate a shopping list
- THEN I should see both entries separately (different units)

**AC-5.1.5:** Shopping List Display

- GIVEN I have generated a shopping list
- WHEN the list loads
- THEN items should be grouped by category:
  - Produce
  - Dairy
  - Meat
  - Pantry
  - etc.
- AND each item should have a checkbox

**AC-5.1.6:** Empty Shopping List

- GIVEN I have no items in my shopping list
- WHEN I view the shopping list page
- THEN I should see an empty state message
- AND I should see the recipe selection interface

**Test Scenarios:**

1. Select 2 recipes → Generate → Verify ingredients combined
2. Recipe A: 2 cups flour, Recipe B: 1 cup flour → Verify shows "3 cups flour"
3. Recipe A: 2 cups milk, Recipe B: 200ml milk → Verify shows 2 separate entries
4. Generate list → Verify grouped by category
5. Empty list → Verify empty state displayed

---

### US-5.2: Manage Shopping List Items

**User Story:**  
As a logged-in user, I want to check off items on my shopping list as I shop so that I can track what I've already purchased.

**Acceptance Criteria:**

**AC-5.2.1:** Check Item

- GIVEN I have items in my shopping list
- WHEN I click the checkbox next to an item
- THEN the item should be marked as checked
- AND the item should have a strikethrough style
- AND the `is_checked` field should be updated in the database

**AC-5.2.2:** Uncheck Item

- GIVEN I have checked an item
- WHEN I click the checkbox again
- THEN the item should be unchecked
- AND the strikethrough should be removed

**AC-5.2.3:** Add Custom Item

- GIVEN I am on the shopping list page
- WHEN I fill in "Item name", "Quantity", "Unit"
- AND I click [Add Item]
- THEN the item should be added to my shopping list
- AND it should appear in the appropriate category

**AC-5.2.4:** Delete Item

- GIVEN I have an item in my shopping list
- WHEN I click [X] delete button
- THEN the item should be removed from the list
- AND it should be deleted from the database

**AC-5.2.5:** Clear Checked Items

- GIVEN I have multiple items, some checked
- WHEN I click [Clear Checked Items]
- THEN all checked items should be removed
- AND unchecked items should remain
- AND I should see confirmation: "5 items removed"

**AC-5.2.6:** Clear All Items

- GIVEN I have items in my shopping list
- WHEN I click [Clear All]
- THEN I should see confirmation dialog: "Delete all items?"
- WHEN I confirm
- THEN all items should be removed from the list

**AC-5.2.7:** Export Shopping List

- GIVEN I have items in my shopping list
- WHEN I click [Export]
- THEN I should be able to download as text file
- OR copy to clipboard
- AND the export should be formatted by category

**Test Scenarios:**

1. Check item → Verify strikethrough applied
2. Uncheck item → Verify strikethrough removed
3. Add custom item "2 bottles olive oil" → Verify added to list
4. Delete item → Verify removed from list
5. Check 3 items → Clear Checked → Verify only checked items removed
6. Export list → Verify text file downloaded with correct format

---

## Traceability Matrix

| User Story ID | PRD Reference | Database Tables | API Endpoints | UI Components |
|---------------|---------------|-----------------|---------------|---------------|
| US-1.1 | PRD §5.1 | recipes | None | RecipeCard, SearchBar |
| US-1.2 | PRD §5.2 | profiles | Supabase Auth | SignupForm |
| US-1.3 | PRD §3.1 | profiles | Supabase Auth | LoginForm |
| US-1.4 | PRD §3.1 | - | Supabase Auth | LogoutButton |
| US-2.1 | PRD §5.3 | recipes, ingredients, recipe_ingredients | /api/recipes (POST) | RecipeForm, IngredientInput |
| US-2.2 | PRD §5.4 | recipes | None (direct query) | RecipeList, MyRecipeCard |
| US-2.3 | PRD §5.5 | recipes, recipe_ingredients | /api/recipes/:id (PUT) | RecipeForm |
| US-2.4 | PRD §5.6 | recipes | /api/recipes/:id (DELETE) | DeleteButton, Dialog |
| US-3.1 | PRD §5.7, §5.8 | recipes | /api/recipes/:id/visibility (PATCH) | VisibilityToggle |
| US-3.2 | PRD §5.9 | recipes | None (direct query) | RecipeCard, SearchBar, TagFilter |
| US-4.1 | PRD §5.10 | recipes, recipe_ingredients | /api/recipes/:id/scale (POST) | RecipeScaler |
| US-5.1 | PRD §5.11 | shopping_lists, shopping_list_items | /api/shopping-lists/generate (POST) | RecipeSelector |
| US-5.2 | PRD §5.12 | shopping_list_items | /api/shopping-lists/items (POST), /api/shopping-lists/items/:id (PATCH/DELETE) | ShoppingList, ShoppingListItem |

---

**Document End**
