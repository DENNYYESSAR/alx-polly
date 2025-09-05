# ALX Polly: Polling App with QR Code Sharing

## Project Overview

ALX Polly is a full-stack web application that allows users to create, manage, and share polls. Users can register, create polls with multiple options, and share these polls via unique links and QR codes. Other users can then vote on these polls. The application emphasizes a modern user interface, secure authentication, and efficient data handling.

**Key Features:**
- User authentication (sign up, log in, password reset)
- Poll creation with questions, descriptions, and multiple options
- Configurable poll settings: allow multiple options, private/public status
- Unique, shareable links for each poll
- QR code generation for easy poll sharing
- Voting mechanism for poll options
- Dashboard to view and manage created polls (edit, delete)
- Display of poll results (total votes, options count)
- Robust error handling and form validation

## Technology Stack

The project is built using the following technologies:

-   **Language**: TypeScript
-   **Main Framework**: Next.js (App Router)
-   **Database & Auth**: Supabase
-   **Styling**: Tailwind CSS with shadcn/ui components
-   **State Management**: Primarily Server Components for server state; `useState` / `useReducer` for local component state in Client Components.
-   **API Communication**: Next.js Server Actions for mutations; Supabase client for data fetching in Server Components.
-   **Utility Libraries**: `qrcode.react` for generating QR codes.
-   **Testing**: Jest with `ts-jest` for unit testing server actions.

## Getting Started

Follow these steps to set up and run the ALX Polly application locally.

### 1. Supabase Configuration

1.  **Create a Supabase Project**:
    *   Go to [Supabase](https://supabase.com/) and create a new project.
    *   Note down your Project URL and Anon Key from your project settings (`Settings -> API`).

2.  **Set up Database Schema**:
    *   You will need to create the necessary tables for `profiles`, `polls`, `poll_options`, and `votes`.
    *   For `profiles`, `polls`, `poll_options`, and `votes` tables, ensure Row Level Security (RLS) is enabled and policies are configured to allow users to `INSERT`, `SELECT`, `UPDATE`, and `DELETE` their own data where appropriate, and `SELECT` public polls.

    Here's a basic schema for reference (you might need more detailed policies and foreign key constraints):

    ```sql
    -- profiles table (for user usernames)
    create table profiles (
      id uuid references auth.users not null primary key,
      username text unique,
      avatar_url text
    );

    -- polls table
    create table polls (
      id uuid primary key default uuid_generate_v4(),
      user_id uuid references auth.users(id) on delete cascade not null,
      question text not null,
      description text,
      created_at timestamp with time zone default now(),
      allow_multiple_options boolean default false,
      is_private boolean default false,
      ends_at timestamp with time zone
    );

    -- poll_options table
    create table poll_options (
      id uuid primary key default uuid_generate_v4(),
      poll_id uuid references polls(id) on delete cascade not null,
      option_text text not null,
      votes_count integer default 0
    );

    -- votes table
    create table votes (
      id uuid primary key default uuid_generate_v4(),
      user_id uuid references auth.users(id) on delete cascade not null,
      poll_id uuid references polls(id) on delete cascade not null,
      poll_option_id uuid references poll_options(id) on delete cascade not null,
      created_at timestamp with time zone default now(),
      unique (user_id, poll_id) -- Prevents multiple votes from the same user on the same poll
    );

    -- RLS policies example (you'll need to create proper ones for all tables)
    -- Enable RLS on all tables
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
    ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
    ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

    -- Profiles Table Policies
    CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
    CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
    CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

    -- Polls Table Policies
    CREATE POLICY "Enable read access for all users" ON polls FOR SELECT USING (true);
    CREATE POLICY "Enable insert for authenticated users only" ON polls FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Enable update for users based on user_id" ON polls FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Enable delete for users based on user_id" ON polls FOR DELETE USING (auth.uid() = user_id);

    -- Poll Options Table Policies
    CREATE POLICY "Enable read access for all users" ON poll_options FOR SELECT USING (true);
    CREATE POLICY "Enable insert for authenticated users only" ON poll_options FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    -- Add update and delete policies as needed

    -- Votes Table Policies
    CREATE POLICY "Enable read access for all users" ON votes FOR SELECT USING (true);
    CREATE POLICY "Enable insert for authenticated users only" ON votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    ```

### 2. Environment Variables

Create a `.env.local` file in the root of your project and add the following:

```
NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
NEXT_PUBLIC_SITE_URL="http://localhost:3000" # Or your deployed URL
```

Replace `"YOUR_SUPABASE_PROJECT_URL"` and `"YOUR_SUPABASE_ANON_KEY"` with your actual Supabase project URL and anonymous key. `NEXT_PUBLIC_SITE_URL` should be your application's base URL.

### 3. Install Dependencies

Install the project dependencies using your preferred package manager:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 4. Run the Application

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 5. Running Tests

This project includes unit tests for server actions using Jest and `ts-jest`.

To run the tests:

```bash
npm test
# or
yarn test
# or
pnpm test
# or
bun test
```

## Usage Examples

### Creating a Poll
1.  Navigate to the "Create New Poll" page.
2.  Enter a question, an optional description, and at least two options.
3.  (Optional) Configure settings like allowing multiple selections or making the poll private.
4.  Click "Create Poll".

### Voting on a Poll
1.  Access a poll via its unique link or QR code.
2.  Select your preferred option(s).
3.  Click "Submit Vote".

### Sharing a Poll
1.  On the poll's view page, you'll find options to "Copy Link" and "Share on Twitter".
2.  A QR code is also displayed for easy mobile scanning.

## Learn More

To learn more about Next.js and Supabase, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
-   [Supabase Documentation](https://supabase.com/docs) - comprehensive guides for Supabase features.
