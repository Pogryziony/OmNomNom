# Technology Stack Documentation

**Project:** OmNomNom - Recipe Management Application  
**Version:** 1.0  
**Date:** October 24, 2025

---

## Overview

OmNomNom is built using modern, stable, and production-ready technologies that prioritize performance, developer experience, and maintainability. The technology stack is carefully selected to support the application's hybrid architecture—fast, static content delivery combined with rich, interactive user experiences.

---

## Technology Stack Components

### Frontend Framework: Astro 5

**Purpose:** Primary framework for building fast, content-driven pages

**Role in Project:**

- Serves as the main framework for page routing and server-side rendering
- Delivers optimized static HTML for maximum performance and SEO
- Provides file-based routing system (`src/pages/` directory)
- Orchestrates integration with React components using Islands Architecture
- Minimizes JavaScript sent to the client by default

**Why Astro 5:**

- Zero JavaScript by default leads to exceptional page load speeds
- Perfect for content-heavy pages (public recipe feed, recipe detail views)
- Seamless integration with React for interactive components
- Built-in TypeScript support
- Excellent developer experience with hot module reloading

**Usage Patterns:**

- All page routes defined as `.astro` files in `src/pages/`
- Layout components for shared page structure
- Static recipe browsing and public feed pages

---

### UI Library: React 19

**Purpose:** Building interactive, stateful user interface components

**Role in Project:**

- Powers all interactive UI components requiring client-side state management
- Handles form inputs, recipe editors, and dynamic user interactions
- Embedded within Astro pages using component islands with hydration directives
- Manages client-side routing within complex interactive features

**Why React 19:**

- Industry-standard UI library with extensive ecosystem
- Latest version includes improved concurrent rendering and transitions
- Strong TypeScript integration
- Large community and mature tooling
- Familiar to most frontend developers

**Usage Patterns:**

- Interactive recipe editor forms (`RecipeEditor.tsx`)
- Authentication forms (login, signup)
- Real-time recipe scaling UI
- Shopping list management interface
- Components imported into Astro pages with `client:load` or `client:idle` directives

**Example Integration:**

```astro
---
import RecipeEditor from '../components/RecipeEditor';
---
<RecipeEditor client:load />
```

---

### Programming Language: TypeScript 5

**Purpose:** Static type checking for all JavaScript code

**Role in Project:**

- Primary language for all application code (both Astro and React)
- Type safety for data models, API contracts, and component props
- Compile-time error detection reduces runtime bugs
- Enhanced IDE intellisense and autocomplete

**Why TypeScript 5:**

- Catches type-related errors during development before deployment
- Self-documenting code through type annotations
- Improved refactoring confidence with type checking
- Better collaboration in team environments
- Industry best practice for modern web applications

**Configuration:**

- Strict mode enabled (`extends "@astrojs/ts-config/strict"`)
- JSX configured for React (`"jsx": "react-jsx"`)
- Path aliases for clean imports (via `tsconfig.json`)

**Usage Patterns:**

- Define interfaces for recipe data structures
- Type-safe Supabase query results
- Strong typing for component props and state
- Type guards for authentication state

---

### Styling Framework: Tailwind CSS 4

**Purpose:** Utility-first CSS framework for rapid UI development

**Role in Project:**

- Primary styling solution for all UI components
- Provides consistent design system through utility classes
- Enables responsive design with mobile-first approach
- Handles all layout, spacing, colors, and typography

**Why Tailwind CSS 4:**

- Rapid prototyping with utility classes directly in markup
- No context switching between HTML and CSS files
- Built-in design constraints ensure consistency
- Tree-shaking removes unused styles for optimal bundle size
- Latest version includes performance improvements and new features

**Configuration:**

- Integrated via `@tailwindcss/vite` plugin in `astro.config.mjs`
- Single global import in `src/styles/global.css`: `@import "tailwindcss";`
- Custom theme configuration for brand colors (indigo primary)

**Usage Patterns:**

- Utility classes for all component styling
- Responsive modifiers for mobile-first design (`sm:`, `md:`, `lg:`)
- Custom design tokens defined in Tailwind config

**Example:**

```tsx
<button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
  Save Recipe
</button>
```

---

### UI Component Library: Shadcn/ui

**Purpose:** Pre-built, accessible React components

**Role in Project:**

- Provides production-ready UI components (buttons, forms, dialogs, cards)
- Ensures accessibility compliance (ARIA attributes, keyboard navigation)
- Maintains consistent design language across application
- Accelerates development by avoiding building common components from scratch

**Why Shadcn/ui:**

- Copy-paste component model (no NPM dependency bloat)
- Fully customizable source code
- Built on Radix UI primitives for accessibility
- Tailwind CSS styling for seamless integration
- TypeScript-first with excellent type definitions

**Configuration:**

- Configured via `components.json` with path aliases
- Components added on-demand via CLI: `npx shadcn@latest add [component]`
- Customized to match project theme (indigo color scheme)

**Usage Patterns:**

- Form components for recipe input
- Dialog modals for confirmations
- Card components for recipe display
- Button variants for CTAs

**Installation Example:**

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add form
```

---

### Backend (BaaS): Supabase

**Purpose:** Complete backend-as-a-service platform

**Role in Project:**

- **Database:** PostgreSQL database for all persistent data storage
  - Stores user accounts, recipes, shopping lists
  - Relational data model with foreign key constraints
  
- **Authentication:** User authentication and session management
  - Email/password authentication
  - JWT token-based sessions
  - Secure password hashing
  
- **Authorization:** Row Level Security (RLS) for data access control
  - Ensures users can only access their own private recipes
  - Policy-based security at database level
  
- **API:** Auto-generated RESTful API and real-time subscriptions
  - Type-safe client library for data operations
  - Real-time listeners for collaborative features (future)

**Why Supabase:**

- Open-source PostgreSQL (avoid vendor lock-in)
- Built-in authentication reduces development time
- Row Level Security provides security at database level
- Real-time capabilities for future features
- Excellent TypeScript SDK
- Free tier sufficient for MVP validation
- Managed hosting with automatic backups

**Configuration:**

- Single client instance in `src/lib/supabase.ts`
- Environment variables: `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`
- Client-side accessible variables prefixed with `PUBLIC_`

**Usage Patterns:**

```typescript
import { supabase } from '@/lib/supabase';

// Query recipes for authenticated user
const { data, error } = await supabase
  .from('recipes')
  .select('*')
  .eq('user_id', userId);
```

---

### CI/CD Platform: GitHub Actions

**Purpose:** Continuous Integration and Continuous Deployment automation

**Role in Project:**

- Automated build verification on every push and pull request
- TypeScript type checking via `astro check`
- Build validation to catch errors before deployment
- Artifact generation for deployment-ready builds
- Ensures code quality and prevents breaking changes

**Why GitHub Actions:**

- Native integration with GitHub repository
- Free for public repositories (generous limits for private)
- YAML-based configuration (version controlled)
- Extensive marketplace of pre-built actions
- Matrix builds for testing across Node versions

**Configuration:**

- Workflow defined in `.github/workflows/ci.yml`
- Triggers on push to `main` and `develop` branches
- Runs on Ubuntu latest with Node.js 20.x

**Pipeline Steps:**

1. Checkout code
2. Setup Node.js environment
3. Install dependencies (`npm ci`)
4. Run type checking (`npx astro check`)
5. Build production bundle (`npm run build`)
6. Upload build artifacts

---

## Technology Integration Architecture

### Data Flow

1. **User Request** → Astro page route
2. **Server-Side** → Astro renders static HTML
3. **Hydration** → React components hydrate with `client:*` directives
4. **User Interaction** → React manages client-side state
5. **Data Operations** → Supabase client SDK for CRUD operations
6. **Authentication** → Supabase Auth validates user sessions
7. **Authorization** → Supabase RLS enforces data access policies

### Development Workflow

1. Developer writes TypeScript code in Astro or React files
2. Tailwind utility classes style components
3. Shadcn/ui components imported when needed
4. Supabase client handles backend operations
5. Local dev server (`npm run dev`) provides hot reload
6. Git commit triggers GitHub Actions CI pipeline
7. CI validates types and builds successfully

### Production Deployment

1. CI pipeline builds static assets to `dist/` directory
2. Astro optimizes and bundles all code
3. Tailwind purges unused CSS
4. Static files deployed to hosting platform (Vercel, Netlify, etc.)
5. Supabase backend remains hosted and managed by Supabase

---

## Technology Version Requirements

| Technology | Minimum Version | Current Version |
|------------|----------------|-----------------|
| Node.js | 20.x | 20.x |
| npm | 10.x | 10.x |
| Astro | 5.0 | 5.15.1 |
| React | 19.0 | 19.2.0 |
| TypeScript | 5.0 | 5.9.3 |
| Tailwind CSS | 4.0 | 4.1.16 |
| Supabase JS Client | 2.x | 2.76.1 |

---

## Development Dependencies

The following tools support the development process:

- **@astrojs/check**: TypeScript type checking for Astro projects
- **@astrojs/react**: Official Astro integration for React
- **@tailwindcss/vite**: Tailwind CSS 4 Vite plugin
- **@types/react**: TypeScript type definitions for React
- **@types/react-dom**: TypeScript type definitions for ReactDOM

---

## Technology Stability Rationale

All selected technologies are:

- **Stable**: Major versions with production-ready status
- **Supported**: Active maintenance and security updates
- **Documented**: Comprehensive official documentation
- **Community-backed**: Large ecosystems and community support
- **Future-proof**: Forward-looking architectures (not deprecated)

No experimental or beta technologies are used in this stack to ensure reliability and maintainability for production deployment.

---

**Document End**
