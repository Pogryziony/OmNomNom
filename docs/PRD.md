# Product Requirements Document (PRD)

## OmNomNom - Recipe Management Application

**Version:** 1.0  
**Date:** October 24, 2025  
**Author:** Product Management Team

---

## 1. Product Description & Goals

### What We're Building

OmNomNom is a web-based recipe management application that allows users to create, organize, and store their personal culinary recipes in a private digital cookbook. The platform enables users to selectively publish recipes to a community-driven public feed, fostering a shared cooking culture while maintaining control over their private content.

### Core Vision

We are building a recipe management platform that solves the dual need for personal organization and community engagement. Users want a secure place to store their family recipes and cooking experiments, but they also want the ability to share their best creations with a broader community when they choose. OmNomNom bridges this gap by providing a private-first experience with optional public sharing.

### Primary Goals

- Create a secure, user-friendly platform for personal recipe management
- Enable seamless transition from private to public recipe sharing
- Build a vibrant community around shared culinary knowledge
- Provide practical tools for everyday cooking (scaling, shopping lists)

---

## 2. User Problem

### Pain Points We're Solving

**Problem 1: Recipe Organization Chaos**
Users currently store recipes across multiple platforms—handwritten notes, bookmarked websites, screenshots, and social media saves. This fragmentation makes it difficult to find recipes when needed and risks losing cherished family recipes.

**Problem 2: Privacy vs. Sharing Dilemma**
Existing recipe platforms force users to choose between completely private recipe apps (limiting community engagement) or fully public social platforms (compromising privacy for family recipes or experimental dishes).

**Problem 3: Inflexible Recipe Management**
Many platforms treat recipes as static content, making it cumbersome to adjust ingredient quantities for different serving sizes or extract shopping lists for meal planning.

**Problem 4: Community Discovery**
Home cooks lack a dedicated space to discover authentic, user-tested recipes from real people rather than commercial recipe sites filled with ads and lengthy blog posts.

---

## 3. Functional Requirements

### 3.1 User Authentication

**Sign Up**

- Users must be able to create an account using email and password
- Email verification required for account activation
- Validation: Email format, password strength (minimum 8 characters, 1 uppercase, 1 number)
- Error handling for duplicate accounts

**Log In**

- Users authenticate using registered email and password
- Session management with secure token-based authentication
- "Remember me" functionality for persistent sessions (30 days)
- Password reset flow via email link

**Log Out**

- Users can explicitly log out from any device
- Session tokens invalidated on logout
- Redirect to public landing page after logout

**Authorization**

- Authenticated users access private recipe management features
- Unauthenticated users (guests) can only view public feed (read-only)
- Middleware checks authentication status before accessing protected routes

### 3.2 Recipe Management (CRUD Operations)

**Create Recipe**

- Authenticated users create new recipes with the following fields:
  - Title (required, max 200 characters)
  - Description (optional, max 5000 characters)
  - Ingredients list (required, structured as array of items with quantity, unit, ingredient name)
  - Instructions (required, ordered steps)
  - Prep time (optional, in minutes)
  - Cook time (optional, in minutes)
  - Servings (required, default: 4)
  - Tags/categories (optional, e.g., "dinner", "vegetarian")
  - Image upload (optional, max 5MB, jpg/png)
- Default privacy: Private
- Default publication status: Unpublished
- Created timestamp recorded automatically
- Recipe linked to user_id of creator

**Read Recipe**

- Users view full details of their own private recipes
- List view: Display user's recipes with thumbnail, title, tags, and last modified date
- Detail view: Display complete recipe with all fields
- Search and filter within own recipes (by title, tags, ingredients)
- Sort options: Date created, alphabetical, last modified

**Update Recipe**

- Users can edit all fields of their own recipes
- Validation enforced on updates (same as creation)
- Last modified timestamp updated automatically
- Version history not tracked in MVP

**Delete Recipe**

- Users can delete their own recipes
- Soft delete with confirmation modal ("Are you sure?")
- Cascade delete: Remove from shopping lists and feed if published
- Permanent deletion after 30 days (trash functionality)

**Ownership & Security**

- Users can only CRUD their own recipes
- Row Level Security (RLS) enforced at database level
- Attempting to access another user's private recipe returns 403 Forbidden

### 3.3 Public Sharing

**Publishing Mechanism**

- Authenticated users toggle recipe status from "Private" to "Public"
- Toggle available in recipe detail view and edit mode
- UI element: Switch/toggle button with clear labels ("Private" | "Public")
- Confirmation dialog for first-time publishers explaining visibility implications

**Privacy State Logic**

- Each recipe has `is_public` boolean field (default: false)
- Private recipes: Visible only to owner
- Public recipes: Visible to all users (authenticated and guests) on public feed
- Published recipes remain editable by owner
- Changes to published recipes reflect immediately on public feed
- Users can revert public recipes to private at any time

**Publication Metadata**

- Track `published_at` timestamp when recipe is first made public
- Track `unpublished_at` timestamp if reverted to private
- Display "Published by [username]" on public recipe view

### 3.4 Public Feed

**Feed Structure**

- Chronological display of all public recipes (most recent first)
- Pagination: 20 recipes per page
- Available to all users (authenticated and guests)
- Read-only for all users except owner

**Feed Features**

- Recipe cards display: Thumbnail image, title, author username, publish date, tags
- Click-through to full recipe detail view
- Filter by tags/categories
- Search by recipe title or ingredients
- Sort options: Newest first, oldest first

**Guest Access**

- Unauthenticated users can browse public feed
- Click on recipe displays full public recipe details
- CTA prompts to sign up/log in for creating own recipes

### 3.5 Recipe Scaling

**Business Logic**

- Users specify desired number of servings (input field, numeric)
- System calculates scaling factor: `scaling_factor = desired_servings / original_servings`
- Each ingredient quantity multiplied by scaling factor
- Display scaled quantities in real-time (no page reload)

**Scaling Rules**

- Numeric quantities: Direct multiplication (e.g., 2 cups → 4 cups for 2x scaling)
- Fractional quantities: Convert to decimal, scale, display as fraction or decimal based on result
- Text-based quantities ("a pinch", "to taste"): Display unchanged with notation "*Not scaled"
- Rounding: Round to nearest common measurement (e.g., 1.33 cups → 1⅓ cups)

**User Experience**

- Scaling UI: Number input with increment/decrement buttons
- Default value: Original servings from recipe
- "Reset to original" button to revert to default
- Scaled values highlighted or indicated with different color
- Scaling state does not persist (resets on page reload)

### 3.6 Shopping List Generation

**Business Logic**

- Users select one or more recipes from their collection
- System aggregates all ingredients across selected recipes
- Combine duplicate ingredients (same name and unit) and sum quantities
- Generate consolidated shopping list

**Aggregation Rules**

- Ingredients with same name and same unit: Sum quantities
  - Example: Recipe A (2 cups flour) + Recipe B (1 cup flour) = 3 cups flour
- Ingredients with same name but different units: List separately
  - Example: 2 cups milk + 200ml milk → listed as two separate items
- Ingredients with text quantities ("a pinch"): List separately for each recipe

**Shopping List Features**

- Display list grouped by category (produce, dairy, meat, pantry, etc.)
- Each item shows: Ingredient name, total quantity, unit
- Checkboxes to mark items as "purchased"
- "Clear completed" button to remove checked items
- Export options: Print, copy to clipboard, or email list
- Persist shopping list in database (user_id linked)
- Users can manually add/edit/remove items from generated list

**User Experience**

- Multi-select interface for choosing recipes
- "Generate Shopping List" button
- Preview before finalizing
- Save list or discard

---

## 4. Project Boundaries (Out of Scope for MVP)

The following features are explicitly **NOT included** in the MVP and will be considered for future iterations:

### AI-Driven Features

- **Recipe Generation via AI** (e.g., Openrouter.ai integration): Users cannot generate recipes from AI prompts or natural language descriptions
- **AI-powered recipe suggestions or recommendations**: No personalized feed algorithm
- **Ingredient substitution suggestions**: No automated alternative ingredient recommendations
- **Nutritional information calculation**: No calorie or macro tracking

### Advanced Social Features

- **User profiles and bios**: Basic username only, no detailed profiles
- **Comments or ratings on public recipes**: No user feedback mechanism on public feed
- **Following/followers system**: No user-to-user relationships
- **Recipe collections or boards**: No ability to save others' public recipes
- **Private messaging between users**

### Advanced Recipe Management

- **Recipe versioning or edit history**: Only current version saved
- **Collaborative editing**: No multi-user recipe editing
- **Recipe import from URLs**: No scraping external websites
- **Meal planning calendar**: No scheduling recipes for specific dates
- **Cooking mode with step-by-step timer**: No interactive cooking interface

### Mobile & Offline Features

- **Native mobile apps**: Web-only for MVP
- **Offline access**: Internet connection required
- **Camera integration for photos**: Users upload existing images only

### Monetization & Advanced Services

- **Premium subscription tiers**: All features free for MVP
- **Ads or sponsored content**
- **Third-party integrations**: (e.g., grocery delivery services)

---

## 5. User Stories

### Authentication & Onboarding

1. **As a new visitor**, I want to browse the public recipe feed without creating an account so that I can evaluate the platform before committing to sign up.

2. **As a home cook**, I want to create an account with my email and password so that I can start storing my personal recipes securely.

### Recipe Management

3. **As a logged-in user**, I want to create a new private recipe with ingredients and instructions so that I can digitally organize my family recipes in one place.

4. **As a logged-in user**, I want to view all my private recipes in a list so that I can quickly find the recipe I want to cook tonight.

5. **As a logged-in user**, I want to edit an existing recipe to fix a typo in the ingredients so that my recipe remains accurate.

6. **As a logged-in user**, I want to delete a recipe I no longer use so that my collection stays organized and clutter-free.

### Public Sharing

7. **As a logged-in user**, I want to toggle a recipe from private to public so that I can share my best dish with the cooking community.

8. **As a logged-in user**, I want to revert a public recipe back to private so that I can control when my recipes are visible to others.

9. **As any user (logged in or guest)**, I want to see all public recipes in a feed so that I can discover new cooking ideas from other users.

### Recipe Scaling

10. **As a logged-in user viewing my recipe**, I want to adjust the serving size from 4 to 8 so that I can see the scaled ingredient quantities for a dinner party without manually calculating.

### Shopping List

11. **As a logged-in user**, I want to select multiple recipes and generate a combined shopping list so that I can efficiently grocery shop for the week without duplicate items.

12. **As a logged-in user**, I want to check off items on my shopping list as I shop so that I can track what I've already purchased.

---

## 6. Success Metrics

### User Acquisition & Engagement

- **Primary KPI**: Number of registered users within first 3 months (Target: 500 users)
- **Activation Rate**: Percentage of registered users who create at least one recipe within 7 days (Target: 60%)
- **Weekly Active Users (WAU)**: Users who log in and interact with the platform weekly (Target: 200 users by month 3)

### Recipe Activity

- **Recipes Created**: Total number of recipes created across all users (Target: 2,000 recipes by month 3)
- **Public vs. Private Ratio**: Percentage of recipes marked as public (Target: 15-20% public)
- **Recipes per User**: Average number of recipes per active user (Target: 5 recipes)

### Feature Utilization

- **Recipe Scaling Usage**: Percentage of recipe views that use the scaling feature (Target: 25%)
- **Shopping List Generation**: Number of shopping lists generated per week (Target: 100/week by month 3)
- **Public Feed Engagement**: Number of public recipe views (Target: 5,000 views/month by month 3)

### Retention & Quality

- **7-Day Retention**: Percentage of users who return within 7 days of signup (Target: 40%)
- **30-Day Retention**: Percentage of users who return within 30 days of signup (Target: 25%)
- **Recipe Completeness**: Percentage of recipes with all recommended fields filled (Title, ingredients, instructions, image) (Target: 70%)

### Technical Performance

- **Page Load Time**: Average time to load recipe detail page (Target: < 2 seconds)
- **Error Rate**: Percentage of failed requests (Target: < 1%)
- **Uptime**: Service availability (Target: 99.5%)

### Qualitative Metrics

- **User Satisfaction**: Post-signup survey rating (Target: 4.0/5.0)
- **Feature Requests**: Track top 5 most-requested features via feedback form
- **Bug Reports**: Number and severity of bugs reported (Track and triage)

---

## Appendix

### Assumptions

- Users have reliable internet access
- Users are comfortable with English language interface
- Primary usage expected on desktop/laptop browsers (responsive mobile web)
- Users willing to manually enter recipe data (no bulk import tools)

### Dependencies

- Supabase service availability and performance
- Image hosting and CDN for recipe photos
- Email delivery service for authentication flows

### Risks

- User adoption: Will users find value in switching from existing tools?
- Content quality: Will users publish high-quality public recipes?
- Privacy concerns: Will users trust platform with personal recipes?

---

**Document End**
