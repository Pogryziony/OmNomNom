# Contributing to OmNomNom

Thank you for considering contributing to OmNomNom! This document provides guidelines for contributing to the project.

## Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/OmNomNom.git
   cd OmNomNom
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

## Code Style

- **TypeScript**: Use strict typing, avoid `any` types
- **Components**: Create reusable, well-documented components
- **Naming**: Use descriptive names for variables, functions, and files
- **Formatting**: The project uses default TypeScript and Astro formatting

## Commit Guidelines

Follow conventional commit format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example:

``` md
feat: add recipe card component
fix: correct type error in Counter component
docs: update README with deployment instructions
```

## Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes and commit**

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

3. **Push to your fork**

   ```bash
   git push origin feat/your-feature-name
   ```

4. **Create a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Ensure CI checks pass

## Building and Testing

Before submitting a PR, ensure:

1. **Type checking passes**

   ```bash
   npx astro check
   ```

2. **Build succeeds**

   ```bash
   npm run build
   ```

3. **No console errors in development**

   ```bash
   npm run dev
   # Check browser console for errors
   ```

## Adding Dependencies

When adding new dependencies:

1. Use exact versions in package.json when possible
2. Verify security: `npm audit`
3. Document why the dependency is needed in your PR

## Questions?

If you have questions or need help, feel free to:

- Open an issue
- Start a discussion
- Reach out to the maintainers

Thank you for contributing! 🎉
