-- Create room_members table for tracking members of rooms
create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id text not null references public.rooms(id) on delete cascade,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, room_id)
);

alter table public.room_members enable row level security;

create policy "Users can insert their own membership"
  on public.room_members for insert
  with check (auth.uid() = user_id);

create policy "Users can view memberships"
  on public.room_members for select
  using (true);
