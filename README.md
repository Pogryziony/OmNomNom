# OmNomNom

A modern recipe management application built with cutting-edge technologies.

## 🚀 Technology Stack

- **Frontend**: Astro 5 + React 19 (hybrid pages and interactive components)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn/ui + Radix UI primitives
- **Backend (BaaS)**: Supabase (PostgreSQL, Auth, Storage)
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **CI/CD**: GitHub Actions

## 📋 Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Supabase account (or Supabase CLI for local dev)

## 🛠️ Setup Instructions

1. Clone the repository and install dependencies.
2. Copy .env.example to .env and set required variables.
3. Run the development server with npm run dev.

The app runs at http://localhost:4321.

## 📝 Available Scripts

- `npm run dev` - Start the dev server
- `npm run dev:local` - Start dev server on 127.0.0.1:4321
- `npm run build` - Build for production
- `npm run build:dev` - Build and run in dev mode
- `npm run build:preview` - Build and preview on port 4322
- `npm run preview` - Preview the production build
- `npm run test` - Run unit/integration tests (Vitest)
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:e2e:ui` - Run Playwright with UI mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix lint issues
- `npm run format` - Format with Prettier
- `npm run astro` - Astro CLI

## 🎨 Adding Shadcn/ui Components

To add Shadcn/ui components to your project:

1. Install the Shadcn/ui CLI (when needed):

   ```bash
   npx shadcn@latest init
   ```

2. Add components as needed:

   ```bash
   npx shadcn@latest add button
   npx shadcn@latest add card
   # etc.
   ```

## 🔐 Environment Variables

Required:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

Optional (local/dev):

- `NODE_ENV`
- `PUBLIC_APP_URL`
- `DEBUG`
- `USE_LOCAL_SUPABASE`

Optional for e2e tests - without these, e2e tests will fail:

- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

You can remove the e2e step in pipeline if not planning to use them.

See .env.example for the full template.

## 🚢 Deployment

CI builds and tests on every push to master and on pull requests. Production builds are output to dist/.

Deploy with any Astro-compatible host (Vercel, Netlify, Cloudflare Pages, or a custom server) using the dist/ output.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
