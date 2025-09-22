CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Roles Table
CREATE TABLE user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'user', -- 'user', 'admin'
  created_at timestamp with time zone default now(),
  unique(user_id)
);

-- Profiles Table
CREATE TABLE profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  username text unique,
  avatar_url text,
  updated_at timestamp with time zone
);

-- Polls Table
CREATE TABLE polls (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  question text not null,
  description text,
  created_at timestamp with time zone default now(),
  ends_at timestamp with time zone,
  allow_multiple_options boolean default false,
  is_private boolean default false,
  allow_unauthenticated_votes boolean default false
);

-- Poll Options Table
CREATE TABLE poll_options (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid references polls(id) on delete cascade not null,
  option_text text not null,
  votes_count integer default 0
);

-- Votes Table
CREATE TABLE votes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade, -- Can be null for unauthenticated votes
  poll_id uuid references polls(id) on delete cascade not null,
  poll_option_id uuid references poll_options(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique (user_id, poll_id) -- Ensures only one vote per authenticated user per poll
);

-- Comments Table
CREATE TABLE comments (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid references polls(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade, -- Can be null for anonymous comments
  content text not null,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Enable read access for all users" ON user_roles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own role" ON user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own role" ON user_roles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any user role" ON user_roles FOR UPDATE TO authenticated USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')) WITH CHECK (true);
CREATE POLICY "Admins can delete any user role" ON user_roles FOR DELETE TO authenticated USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for polls
CREATE POLICY "Enable read access for all users" ON polls FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON polls FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for users based on user_id" ON polls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Enable delete for users based on user_id or admin" ON polls FOR DELETE USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- RLS Policies for poll_options
CREATE POLICY "Enable read access for all users" ON poll_options FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON poll_options FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for users based on poll_id" ON poll_options FOR UPDATE USING (EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.user_id = auth.uid()));
CREATE POLICY "Enable delete for users based on poll_id" ON poll_options FOR DELETE USING (EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.user_id = auth.uid()));

-- RLS Policies for votes
CREATE POLICY "Allow authenticated users to read their own votes and unauthenticated votes" ON votes FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Allow authenticated users to insert a vote" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id AND (SELECT allow_multiple_options FROM polls WHERE id = poll_id));
CREATE POLICY "Allow unauthenticated users to insert a vote if allowed by poll" ON votes FOR INSERT WITH CHECK (user_id IS NULL AND (SELECT allow_unauthenticated_votes FROM polls WHERE id = poll_id));
CREATE POLICY "Allow authenticated users to delete their own votes" ON votes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Allow admins to delete any vote" ON votes FOR DELETE TO authenticated USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- RLS Policies for comments
CREATE POLICY "Enable read access for all users" ON comments FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable delete for comment owners or admins" ON comments FOR DELETE USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));
