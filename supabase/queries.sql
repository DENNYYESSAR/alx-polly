-- RLS Policies (example)
-- These policies ensure that users can only access and modify their own data,
-- and public polls are viewable by everyone.

-- User Roles Table Policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON user_roles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own role" ON user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own role" ON user_roles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any user role" ON user_roles FOR UPDATE TO authenticated USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')) WITH CHECK (true);
CREATE POLICY "Admins can delete any user role" ON user_roles FOR DELETE TO authenticated USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- Profiles Table Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Polls Table Policies
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON polls FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON polls FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for users based on user_id" ON polls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Enable delete for users based on user_id or admin" ON polls FOR DELETE USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- Poll Options Table Policies
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON poll_options FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON poll_options FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for users based on poll_id" ON poll_options FOR UPDATE USING (EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.user_id = auth.uid()));
CREATE POLICY "Enable delete for users based on poll_id" ON poll_options FOR DELETE USING (EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.user_id = auth.uid()));

-- Votes Table Policies
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read their own votes and unauthenticated votes" ON votes FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Allow authenticated users to insert a vote" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id AND (SELECT allow_multiple_options FROM polls WHERE id = poll_id));
CREATE POLICY "Allow unauthenticated users to insert a vote if allowed by poll" ON votes FOR INSERT WITH CHECK (user_id IS NULL AND (SELECT allow_unauthenticated_votes FROM polls WHERE id = poll_id));
CREATE POLICY "Allow authenticated users to delete their own votes" ON votes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Allow admins to delete any vote" ON votes FOR DELETE TO authenticated USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- Comments Table Policies
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON comments FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable delete for comment owners or admins" ON comments FOR DELETE USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));


-- Other SQL Queries (extracted from codebase)

-- Example SELECT from app/polls/[id]/page.tsx and app/polls/[id]/edit/page.tsx
-- `id, question, description, created_at, user_id, allow_multiple_options, is_private, allow_unauthenticated_votes, poll_options(id, option_text, votes_count), comments(id, user_id, content, created_at), profiles(username)`

-- Example SELECT from app/polls/page.tsx
-- `id, question, description, created_at, ends_at, is_private, user_id, poll_options(id, option_text, votes_count)`

-- Example INSERT from lib/actions.ts (createPoll)
-- `question, description, user_id, allow_multiple_options, is_private, ends_at, allow_unauthenticated_votes`

-- Example UPDATE from lib/actions.ts (updatePoll)
-- `question, description`

-- Example UPDATE from lib/actions.ts (updatePollSettings)
-- `allow_multiple_options, is_private, allow_unauthenticated_votes`

-- Example DELETE from lib/actions.ts (deletePoll)
-- `id` (with user_id condition or admin override)

