# OmNomNom

A modern recipe management application built with cutting-edge technologies.

## 🚀 Technology Stack

- **Frontend**: Astro 5 (for fast, content-driven pages) with React 19 (for interactive components)
- **Language**: TypeScript 5 (for static typing)
- **Styling**: Tailwind CSS 4 (for utility-first CSS)
- **UI Components**: Shadcn/ui (for accessible, pre-built React components)
- **Backend (BaaS)**: Supabase (PostgreSQL database, authentication, and BaaS)
- **CI/CD**: GitHub Actions (for building and testing)

## 📋 Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- A Supabase account (for backend services)

## 🛠️ Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pogryziony/OmNomNom.git
   cd OmNomNom
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials:
     ```bash
     cp .env.example .env
     ```
   - Update the values in `.env` with your Supabase URL and anon key

4. **Run the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:4321`

## 📝 Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build locally
- `npm run astro` - Run Astro CLI commands

## 🏗️ Project Structure

```
/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   ├── layouts/         # Astro layouts
│   ├── lib/            # Utility functions and configurations
│   ├── pages/          # Astro pages (file-based routing)
│   └── styles/         # Global styles
├── .github/
│   └── workflows/      # GitHub Actions CI/CD
├── astro.config.mjs    # Astro configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Project dependencies
```

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

The following environment variables are required:

- `PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

See `.env.example` for a template.

## 🚢 Deployment

The project includes a GitHub Actions workflow that automatically builds and tests the application on every push to `main` or `develop` branches.

For deployment, you can use various platforms:
- **Vercel**: Connect your GitHub repository
- **Netlify**: Connect your GitHub repository
- **Cloudflare Pages**: Connect your GitHub repository
- **Custom server**: Use the built files from the `dist/` directory

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.