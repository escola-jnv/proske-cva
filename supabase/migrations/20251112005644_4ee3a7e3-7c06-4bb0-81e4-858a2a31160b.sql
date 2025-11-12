-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create enum for user roles (CRITICAL: separate from profiles for security)
create type public.app_role as enum ('student', 'teacher', 'admin');

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  bio text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Create user_roles table (SECURITY: Never store roles in profiles table)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone not null default now(),
  unique (user_id, role)
);

-- Create communities table
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  subject text not null,
  cover_image_url text,
  created_by uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Create community_members table
create table public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  joined_at timestamp with time zone not null default now(),
  unique (community_id, user_id)
);

-- Create messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.messages enable row level security;

-- Create security definer function to check roles (prevents RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS Policies for profiles
create policy "Users can view all profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- RLS Policies for user_roles
create policy "Users can view their own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can manage all roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for communities
create policy "Anyone can view communities"
  on public.communities for select
  to authenticated
  using (true);

create policy "Teachers can create communities"
  on public.communities for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'teacher') or 
    public.has_role(auth.uid(), 'admin')
  );

create policy "Creators can update their communities"
  on public.communities for update
  to authenticated
  using (auth.uid() = created_by);

create policy "Creators and admins can delete communities"
  on public.communities for delete
  to authenticated
  using (
    auth.uid() = created_by or 
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for community_members
create policy "Members can view their memberships"
  on public.community_members for select
  to authenticated
  using (true);

create policy "Users can join communities"
  on public.community_members for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can leave communities"
  on public.community_members for delete
  to authenticated
  using (auth.uid() = user_id);

-- RLS Policies for messages
create policy "Members can view messages in their communities"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.community_members
      where community_id = messages.community_id
        and user_id = auth.uid()
    )
  );

create policy "Members can send messages"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.community_members
      where community_id = messages.community_id
        and user_id = auth.uid()
    )
  );

create policy "Users can update their own messages"
  on public.messages for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their own messages"
  on public.messages for delete
  to authenticated
  using (auth.uid() = user_id);

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Create profile
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Novo usuário')
  );
  
  -- Assign default student role
  insert into public.user_roles (user_id, role)
  values (new.id, 'student');
  
  return new;
end;
$$;

-- Trigger to create profile and role on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create function to update timestamps
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_communities_updated_at
  before update on public.communities
  for each row execute procedure public.handle_updated_at();

create trigger set_messages_updated_at
  before update on public.messages
  for each row execute procedure public.handle_updated_at();

-- Enable Realtime for messages (for live chat)
alter publication supabase_realtime add table public.messages;

-- Create indexes for performance
create index idx_profiles_id on public.profiles(id);
create index idx_user_roles_user_id on public.user_roles(user_id);
create index idx_communities_created_by on public.communities(created_by);
create index idx_community_members_user_id on public.community_members(user_id);
create index idx_community_members_community_id on public.community_members(community_id);
create index idx_messages_community_id on public.messages(community_id);
create index idx_messages_user_id on public.messages(user_id);
create index idx_messages_created_at on public.messages(created_at desc);