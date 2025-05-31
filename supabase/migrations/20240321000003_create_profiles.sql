-- Create user_role enum type
create type user_role as enum ('user', 'admin');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name varchar(255),
  avatar_url varchar(255),
  role user_role default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  deleted_at timestamp with time zone
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id and deleted_at is null);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id and deleted_at is null);

create policy "Admins can delete profiles"
  on public.profiles for update
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function update_updated_at_column(); 