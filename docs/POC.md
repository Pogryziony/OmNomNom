# Proof of Concept (POC) Plan

**Project:** OmNomNom - Recipe Management Application  
**Version:** 1.0  
**Date:** October 24, 2025

---

## POC Goal

**Validate the core technical architecture by proving that Astro 5 (frontend) can successfully communicate with Supabase (backend) for user authentication and user-specific data operations.**

The POC de-risks the primary technical integration between our chosen frontend framework (Astro + React) and backend service (Supabase) before full MVP development. This validation ensures:

1. Astro can embed React components that interact with Supabase
2. Supabase Authentication works within the Astro/React hybrid architecture
3. Authenticated users can perform CRUD operations on database tables
4. Row Level Security (RLS) properly restricts data access to authenticated users
5. The development workflow is smooth and sustainable

---

## POC Scope

### What the POC Will Demonstrate

✅ **User Authentication**: Sign up and log in functionality  
✅ **Authenticated Data Write**: Create new database records linked to authenticated user  
✅ **Authenticated Data Read**: Retrieve only the user's own records  
✅ **Row Level Security**: Verify users cannot access other users' data  
✅ **Astro + React Integration**: Confirm React components work within Astro pages  

### What the POC Will NOT Include

❌ Full recipe data model (simplified text-only "recipes" for POC)  
❌ Complete UI/UX design  
❌ Public recipe feed  
❌ Recipe editing or deletion  
❌ Production deployment  
❌ Comprehensive error handling  

---

## POC Steps

### Step 1: Initialize Astro 5 Project

**Objective:** Set up the foundational Astro project with React integration.

**Tasks:**

1. Create new Astro project using official CLI:

   ```bash
   npm create astro@latest omnomnom-poc
   cd omnomnom-poc
   ```

   - Select template: "Empty" (start minimal)
   - Choose TypeScript: "Strict"
   - Install dependencies: Yes

2. Install React integration:

   ```bash
   npx astro add react
   ```

3. Verify development server runs:

   ```bash
   npm run dev
   ```

   - Confirm localhost:4321 loads successfully

4. Create basic file structure:

   ``` md
   src/
   ├── components/
   │   ├── AuthForm.tsx       # React component for login/signup
   │   └── RecipeForm.tsx     # React component for creating recipe
   ├── layouts/
   │   └── Layout.astro       # Base layout
   ├── lib/
   │   └── supabase.ts        # Supabase client configuration
   └── pages/
       ├── index.astro        # Landing/login page
       └── dashboard.astro    # Authenticated user dashboard
   ```

**Success Criteria:**

- Astro dev server runs without errors
- React component renders within Astro page
- Hot module reloading works

---

### Step 2: Set Up Supabase Project

**Objective:** Configure Supabase backend with authentication and a simple recipes table.

**Tasks:**

1. **Create Supabase Project:**
   - Navigate to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Set project name: "omnomnom-poc"
   - Set strong database password
   - Choose region closest to development location
   - Wait for project provisioning (~2 minutes)

2. **Enable Email Authentication:**
   - Navigate to Authentication → Providers
   - Verify Email provider is enabled (default)
   - Configure email templates (optional for POC, use defaults)

3. **Create Recipes Table:**
   - Navigate to SQL Editor
   - Run the following SQL to create table and RLS policies:

   ```sql
   -- Create recipes table
   CREATE TABLE recipes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
     title TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

   -- Policy: Users can insert their own recipes
   CREATE POLICY "Users can insert own recipes"
     ON recipes FOR INSERT
     WITH CHECK (auth.uid() = user_id);

   -- Policy: Users can select only their own recipes
   CREATE POLICY "Users can view own recipes"
     ON recipes FOR SELECT
     USING (auth.uid() = user_id);
   ```

4. **Get API Credentials:**
   - Navigate to Project Settings → API
   - Copy `Project URL` (e.g., `https://xyz.supabase.co`)
   - Copy `anon/public` key

5. **Configure Environment Variables:**
   - Create `.env` file in Astro project root:

     ```bash
     PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
     ```

   - Create `.env.example` template for documentation

**Success Criteria:**

- Supabase project created and accessible
- `recipes` table exists with correct schema
- RLS policies active on `recipes` table
- API credentials obtained and stored in `.env`

---

### Step 3: Implement Authentication Flow

**Objective:** Build login and signup functionality using React component within Astro.

**Tasks:**

1. **Install Supabase Client:**

   ```bash
   npm install @supabase/supabase-js
   ```

2. **Create Supabase Client Instance:**
   - Create `src/lib/supabase.ts`:

     ```typescript
     import { createClient } from '@supabase/supabase-js';

     const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
     const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

     export const supabase = createClient(supabaseUrl, supabaseAnonKey);
     ```

3. **Build AuthForm React Component:**
   - Create `src/components/AuthForm.tsx`:
     - Form with email and password inputs
     - Toggle between "Sign Up" and "Log In" modes
     - Use Supabase client for authentication:

       ```typescript
       // Sign up
       await supabase.auth.signUp({ email, password });
       
       // Log in
       await supabase.auth.signInWithPassword({ email, password });
       ```

     - Display success/error messages
     - Store session in Supabase client (automatic)

4. **Create Login Page:**
   - Create `src/pages/index.astro`:
     - Import and render `<AuthForm client:load />`
     - Include instructions for POC testers

5. **Test Authentication:**
   - Sign up with test email (e.g., `test@example.com`)
   - Verify account created in Supabase Dashboard (Authentication → Users)
   - Log in with same credentials
   - Verify session token stored in browser (check browser DevTools → Application → Local Storage)

**Success Criteria:**

- User can sign up successfully
- User appears in Supabase auth.users table
- User can log in with correct credentials
- Invalid credentials show error message
- Session persists in browser

---

### Step 4: Demonstrate Authenticated Data Write

**Objective:** Prove that authenticated users can create records in the database linked to their user_id.

**Tasks:**

1. **Create RecipeForm React Component:**
   - Create `src/components/RecipeForm.tsx`:
     - Simple form with single text input for recipe title
     - Submit button
     - Use Supabase client to get current user:

       ```typescript
       const { data: { user } } = await supabase.auth.getUser();
       ```

     - Insert recipe into database:

       ```typescript
       const { data, error } = await supabase
         .from('recipes')
         .insert({ title: recipeTitle, user_id: user.id });
       ```

     - Display success message or error

2. **Create Dashboard Page:**
   - Create `src/pages/dashboard.astro`:
     - Check authentication status (redirect to login if not authenticated)
     - Display RecipeForm component: `<RecipeForm client:load />`
     - Add logout button

3. **Test Data Write:**
   - Log in as test user
   - Navigate to dashboard page
   - Enter recipe title (e.g., "Chocolate Cake")
   - Click submit
   - Verify success message

4. **Verify in Supabase Dashboard:**
   - Navigate to Table Editor → recipes
   - Confirm new row exists with correct `title` and `user_id`

**Success Criteria:**

- Authenticated user can submit recipe form
- Recipe appears in `recipes` table with correct `user_id`
- Unauthenticated users cannot create recipes (enforced by RLS)

---

### Step 5: Demonstrate Authenticated Data Read with RLS

**Objective:** Validate that users can only retrieve their own recipes, not others'.

**Tasks:**

1. **Add Recipe List to Dashboard:**
   - Modify `src/components/RecipeForm.tsx` or create new `RecipeList.tsx`:
     - Fetch recipes for authenticated user:

       ```typescript
       const { data: recipes, error } = await supabase
         .from('recipes')
         .select('*')
         .order('created_at', { ascending: false });
       ```

     - Display list of recipes with title and creation date
     - Show "No recipes yet" if empty

2. **Test Data Read:**
   - As logged-in user, view dashboard
   - Verify only recipes created by this user are displayed
   - Create 2-3 recipes to populate list

3. **Test Row Level Security:**
   - Create a second test user account (e.g., `test2@example.com`)
   - Log in as second user
   - Create 1-2 recipes for second user
   - Verify second user sees only their own recipes
   - Log back in as first user
   - Verify first user still sees only their recipes (not second user's)

4. **Test SQL Injection Prevention:**
   - Attempt direct SQL query in Supabase SQL Editor as authenticated user:

     ```sql
     SELECT * FROM recipes WHERE user_id != 'current-user-id';
     ```

   - Verify RLS blocks access to other users' recipes

**Success Criteria:**

- User sees list of only their own recipes
- Different users see different recipes (no cross-contamination)
- RLS policies prevent unauthorized access via SQL Editor
- No SQL injection vulnerabilities

---

## POC Timeline

| Step | Duration | Cumulative Time |
|------|----------|-----------------|
| 1. Initialize Astro Project | 2 hours | 2 hours |
| 2. Set Up Supabase Project | 2 hours | 4 hours |
| 3. Implement Authentication | 8 hours | 12 hours |
| 4. Authenticated Data Write | 6 hours | 18 hours |
| 5. Authenticated Data Read & RLS | 6 hours | 24 hours |
| **Testing & Documentation** | 2 hours | **26 hours** |

**Total Estimated Time:** 2-3 days of focused development

---

## POC Success Criteria Summary

The POC will be considered successful if:

✅ **Authentication Works:** Users can sign up and log in via Supabase Auth  
✅ **Session Management:** User sessions persist across page reloads  
✅ **Data Write:** Authenticated users can create recipes linked to their user_id  
✅ **Data Read:** Authenticated users can retrieve their own recipes  
✅ **Row Level Security:** Users cannot access other users' recipes (verified through testing)  
✅ **Astro + React Integration:** React components function correctly within Astro pages  
✅ **TypeScript Compilation:** No type errors in codebase  

---

## POC Deliverables

At the end of the POC, the following will be available:

1. **Working Code Repository:**
   - Functional Astro + React + Supabase application
   - Authentication flow (signup/login)
   - Simple recipe creation and listing
   - Source code committed to Git

2. **POC Report Document:**
   - Summary of what was validated
   - Technical challenges encountered and solutions
   - Recommendations for MVP development
   - Any architecture adjustments needed

3. **Database Schema:**
   - SQL scripts for table creation
   - RLS policies documented

4. **Environment Setup Guide:**
   - Instructions for replicating POC environment
   - `.env.example` template

---

## Potential Risks & Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| **RLS policies fail to restrict access** | Thoroughly test with multiple user accounts; review Supabase documentation |
| **Session management issues** | Use Supabase SDK's built-in session handling; test across browser tabs |
| **Astro + React hydration problems** | Use appropriate `client:*` directive; test component interactivity |
| **TypeScript type errors with Supabase** | Use Supabase's TypeScript code generation; define custom types |
| **Environment variable issues** | Validate `.env` loading; use `PUBLIC_` prefix for client-side variables |

---

## Next Steps After POC

If POC is successful:

1. **Expand Data Model:** Create full recipe schema with ingredients, instructions, etc.
2. **Build MVP Features:** Recipe CRUD operations, public/private toggle, public feed
3. **Enhance UI:** Apply Tailwind CSS and Shadcn/ui components
4. **Add Error Handling:** Comprehensive error states and user feedback
5. **Set Up CI/CD:** GitHub Actions pipeline
6. **Deploy to Production:** Choose hosting platform (Vercel, Netlify, Cloudflare Pages)

If POC encounters blockers:

- Reassess technology choices
- Consult Supabase and Astro communities
- Consider alternative authentication or database solutions

---
