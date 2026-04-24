-- Add last_read_at to room_members for tracking per-user read timestamps
alter table public.room_members
  add column if not exists last_read_at timestamp with time zone;

alter table public.room_members enable row level security;

create policy "Users can update their last_read_at"
  on public.room_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
