# Application: OmNomNom (MVP)

**Version:** 1.0  
**Date:** October 24, 2025

---

## Main Problem

Home cooks lack a single, secure platform to organize their personal recipes digitally while maintaining full privacy control. Existing solutions force users to choose between completely private apps (limiting sharing opportunities) or public social platforms (compromising privacy). Users need a **private-first recipe management system** that allows them to:

1. Store and organize personal recipes securely
2. Access their recipes from any device
3. Selectively share recipes with a community when desired
4. Maintain clear boundaries between private and public content

The MVP focuses on solving the **core recipe storage and organization problem** with basic authentication and privacy controls.

---

## Smallest Set of Features

The MVP includes only the essential features required to validate the core value proposition:

### User Authentication

- **User Registration**: Email and password signup with email verification
- **User Login**: Secure authentication with session management
- **User Logout**: Explicit logout with session termination

### Private Recipe Management (CRUD)

- **Create Recipe**: Form to add new recipe with title, ingredients, instructions, servings
  - All recipes default to private
  - Minimum required fields: title, ingredients, instructions, servings
- **View Own Recipes**: List view showing all recipes created by logged-in user
  - Display recipe title, creation date, and servings
  - Click through to detailed recipe view
- **Edit Recipe**: Update any field of existing recipe
  - Save changes with validation
- **Delete Recipe**: Remove recipe from collection
  - Soft delete with confirmation dialog

### Basic Recipe Publishing

- **Toggle Public/Private Status**: Simple switch to make a recipe visible on public feed or keep it private
  - Binary state: private (default) or public
  - Instant update without additional steps

### Public Recipe Feed (Read-Only)

- **View Public Recipes**: Chronological feed of all published recipes
  - Available to authenticated users and guests
  - Display recipe title, author username, publication date
  - Click through to view full recipe details
  - Basic pagination (20 recipes per page)

### Security & Data Isolation

- **Row Level Security (RLS)**: Users can only access their own private recipes
- **Guest Access**: Unauthenticated users can view public feed but cannot create recipes

---

## What's NOT Included in MVP?

The following features are deferred to post-MVP iterations:

### Recipe Management Features

- Recipe scaling (adjust servings and auto-calculate ingredient quantities)
- Shopping list generation from recipes
- Recipe images/photos
- Recipe categories or tags
- Recipe search functionality
- Recipe filtering or sorting (beyond chronological)
- Prep time and cook time fields
- Recipe description field (beyond title and instructions)

### Social Features

- Comments on public recipes
- Recipe ratings or likes
- User profiles (beyond username)
- Following other users
- Saving/bookmarking others' public recipes
- Recipe collections or boards

### Advanced Features

- AI-powered recipe generation (Openrouter.ai integration)
- AI recipe suggestions or recommendations
- Ingredient substitution suggestions
- Nutritional information
- Meal planning calendar
- Recipe import from URLs
- Print-friendly recipe view
- Export recipes to PDF

### Technical Enhancements

- Mobile native apps (web-only for MVP)
- Offline functionality
- Real-time collaboration
- Recipe versioning/edit history
- Bulk operations (delete multiple, bulk publish)
- Advanced image handling (cropping, filters)

### User Experience Enhancements

- Onboarding tutorial
- Email notifications
- Password strength meter
- Social login (Google, Facebook)
- Two-factor authentication
- Account recovery options beyond email

---

## Success Criteria

The MVP will be considered successful if we achieve the following measurable goal:

### Primary Success Metric

**Achieve 100 registered users who have created at least one private recipe within the first month of launch.**

This metric validates:

- Users find enough value to complete registration
- The core recipe creation flow is functional and user-friendly
- Users trust the platform enough to input their personal recipe data
- The minimum feature set addresses the primary pain point (recipe storage and organization)

### Secondary Success Indicators

- **30-Day Retention**: At least 30% of users who create a recipe return within 30 days
- **Public Recipe Adoption**: At least 10% of created recipes are published publicly (validates sharing feature)
- **Technical Stability**: System uptime of 99% with no critical bugs blocking recipe creation
- **User Feedback**: Collect qualitative feedback via post-signup survey to identify top feature requests for next iteration

### MVP Timeline

- **Development**: 6-8 weeks
- **Testing & Bug Fixes**: 2 weeks
- **Launch & Measurement Period**: 1 month (30 days)

---

## MVP Validation Questions

The MVP is designed to answer these critical questions:

1. **Will users adopt a recipe management tool?** (Measured by signup and recipe creation rates)
2. **Is the private-first approach valuable?** (Measured by ratio of private vs. public recipes)
3. **Can we build a functional Astro + Supabase architecture?** (Validated through POC and MVP development)
4. **Will users share recipes publicly?** (Measured by publication rate and public feed engagement)
5. **What features are most critical for retention?** (Identified through user feedback and usage patterns)

---
