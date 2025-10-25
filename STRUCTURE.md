# Project Structure

This document describes the structure of the OmNomNom project.

## Directory Layout

``` md
OmNomNom/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD pipeline
├── public/
│   └── favicon.svg             # Application favicon
├── src/
│   ├── components/
│   │   └── Counter.tsx         # Example React 19 component
│   ├── layouts/
│   │   └── Layout.astro        # Base layout with Tailwind CSS
│   ├── lib/
│   │   └── supabase.ts         # Supabase client configuration
│   ├── pages/
│   │   └── index.astro         # Homepage (file-based routing)
│   └── styles/
│       └── global.css          # Global Tailwind CSS styles
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore patterns
├── astro.config.mjs            # Astro configuration
├── components.json             # Shadcn/ui configuration
├── package.json                # Project dependencies and scripts
├── README.md                   # Project documentation
└── tsconfig.json               # TypeScript configuration
```

## Key Files

### Configuration Files

- **astro.config.mjs**: Configures Astro with React integration and Tailwind CSS 4 via Vite plugin
- **tsconfig.json**: TypeScript configuration with strictest settings
- **components.json**: Shadcn/ui configuration for adding UI components
- **.env.example**: Template for environment variables (copy to .env)

### Source Files

- **src/pages/index.astro**: Main landing page showcasing the tech stack
- **src/components/Counter.tsx**: Example React 19 component with state management
- **src/layouts/Layout.astro**: Base layout that imports global styles
- **src/lib/supabase.ts**: Configured Supabase client for database operations
- **src/styles/global.css**: Tailwind CSS 4 import

### CI/CD

- **.github/workflows/ci.yml**: Automated build and type checking on push/PR

## Adding New Pages

Astro uses file-based routing. To add a new page:

1. Create a new `.astro` file in `src/pages/`
2. Example: `src/pages/about.astro` → `/about` route

## Adding React Components

1. Create a new `.tsx` file in `src/components/`
2. Use the component in Astro pages with `client:load` directive:

   ```astro
   <MyComponent client:load />
   ```

## Adding Shadcn/ui Components

Run the following command to add components:

```bash
npx shadcn@latest add [component-name]
```

Example:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add form
```

## Environment Variables

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Required variables:

- `PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Type check and build for production
- `npm run preview`: Preview production build locally
- `npm run astro`: Run Astro CLI commands
