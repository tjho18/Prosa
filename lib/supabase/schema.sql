-- Run this in the Supabase SQL editor to set up the database

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Novels
create table if not exists novels (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles on delete cascade not null,
  slug text unique not null,
  title text not null,
  tagline text,
  description text,
  cover_bg text default '#2a3a2a' not null,
  cover_ink text default '#ebe4d4' not null,
  cover_accent text default '#8a3a2a' not null,
  cover_layout text default 'banded' not null,
  status text default 'draft' not null check (status in ('draft','serial','complete')),
  tags text[] default '{}' not null,
  total_chapters int default 0 not null,
  published_chapters int default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Chapters
create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid references novels on delete cascade not null,
  number int not null,
  title text not null,
  content text default '' not null,
  word_count int default 0 not null,
  published_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(novel_id, number)
);

-- Reading progress
create table if not exists reading_progress (
  user_id uuid references profiles on delete cascade not null,
  novel_id uuid references novels on delete cascade not null,
  chapter_number int default 1 not null,
  scroll_position float default 0 not null,
  updated_at timestamptz default now() not null,
  primary key(user_id, novel_id)
);

-- Auto-update timestamps
create or replace function update_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;

create or replace trigger novels_updated_at before update on novels
  for each row execute procedure update_updated_at();
create or replace trigger chapters_updated_at before update on chapters
  for each row execute procedure update_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
declare
  base_username text;
  final_username text;
  counter int := 0;
begin
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    '[^a-z0-9_]', '', 'g'
  ));
  if length(base_username) < 3 then base_username := 'reader' || base_username; end if;
  final_username := base_username;
  loop
    begin
      insert into public.profiles(id, username, display_name)
      values (new.id, final_username, new.raw_user_meta_data->>'display_name');
      exit;
    exception when unique_violation then
      counter := counter + 1;
      final_username := base_username || counter::text;
    end;
  end loop;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Auto-update novel chapter counts
create or replace function update_novel_chapter_counts()
returns trigger as $$
begin
  update novels set
    total_chapters = (select count(*) from chapters where novel_id = coalesce(new.novel_id, old.novel_id)),
    published_chapters = (select count(*) from chapters where novel_id = coalesce(new.novel_id, old.novel_id) and published_at is not null)
  where id = coalesce(new.novel_id, old.novel_id);
  return coalesce(new, old);
end;
$$ language plpgsql;

create or replace trigger chapters_count_update
  after insert or update or delete on chapters
  for each row execute procedure update_novel_chapter_counts();

-- Row Level Security
alter table profiles enable row level security;
alter table novels enable row level security;
alter table chapters enable row level security;
alter table reading_progress enable row level security;

-- Profiles: readable by all, editable by owner
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Novels: published ones readable by all; drafts only by author
create policy "novels_select_published" on novels for select
  using (status != 'draft' or author_id = auth.uid());
create policy "novels_insert" on novels for insert with check (author_id = auth.uid());
create policy "novels_update" on novels for update using (author_id = auth.uid());
create policy "novels_delete" on novels for delete using (author_id = auth.uid());

-- Chapters: published ones readable by all; drafts only by author
create policy "chapters_select" on chapters for select
  using (published_at is not null or exists (
    select 1 from novels where id = novel_id and author_id = auth.uid()
  ));
create policy "chapters_insert" on chapters for insert with check (
  exists (select 1 from novels where id = novel_id and author_id = auth.uid())
);
create policy "chapters_update" on chapters for update using (
  exists (select 1 from novels where id = novel_id and author_id = auth.uid())
);
create policy "chapters_delete" on chapters for delete using (
  exists (select 1 from novels where id = novel_id and author_id = auth.uid())
);

-- Reading progress: private per user
create policy "progress_select" on reading_progress for select using (user_id = auth.uid());
create policy "progress_upsert" on reading_progress for all using (user_id = auth.uid());

-- ── Follows (run as a separate migration if adding to existing DB) ──────────

create table if not exists follows (
  follower_id uuid references profiles on delete cascade not null,
  following_id uuid references profiles on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

alter table follows enable row level security;

create policy "follows_select" on follows for select using (true);
create policy "follows_insert" on follows for insert with check (follower_id = auth.uid());
create policy "follows_delete" on follows for delete using (follower_id = auth.uid());
