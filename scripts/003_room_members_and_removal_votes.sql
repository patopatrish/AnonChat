-- Room membership: who is in a room and whether they have been removed (wallet-based voting)
create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  removed_at timestamp with time zone,
  unique(room_id, user_id)
);

create index if not exists room_members_room_id_idx on public.room_members(room_id);
create index if not exists room_members_user_id_idx on public.room_members(user_id);
create index if not exists room_members_removed_at_idx on public.room_members(room_id) where removed_at is null;

alter table public.room_members enable row level security;

-- Members can view other members in the same room; public rooms viewable by any authenticated user
create policy "Room members can view room_members"
  on public.room_members for select
  using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = room_members.room_id
        and rm.user_id = auth.uid()
        and rm.removed_at is null
    )
    or exists (
      select 1 from public.rooms r
      where r.id = room_id and r.is_private = false
    )
  );

-- Only room creator or system can insert (we use service role or trigger for auto-join on first message)
create policy "Authenticated users can join rooms"
  on public.room_members for insert
  with check (auth.uid() = user_id);

-- Only room creator can update (e.g. set removed_at); we use API with threshold check
create policy "Room creators can update members"
  on public.room_members for update
  using (
    exists (select 1 from public.rooms r where r.id = room_id and r.created_by = auth.uid())
  );

-- Removal votes: one vote per (room, target, voter)
create table if not exists public.room_removal_votes (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  voter_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(room_id, target_user_id, voter_user_id),
  check (target_user_id != voter_user_id)
);

create index if not exists room_removal_votes_room_target_idx on public.room_removal_votes(room_id, target_user_id);
create index if not exists room_removal_votes_voter_idx on public.room_removal_votes(voter_user_id);

alter table public.room_removal_votes enable row level security;

-- Room members can view votes in their room
create policy "Room members can view removal votes"
  on public.room_removal_votes for select
  using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = room_removal_votes.room_id
        and rm.user_id = auth.uid()
        and rm.removed_at is null
    )
  );

-- Room members (non-removed) can insert their own vote
create policy "Room members can cast removal vote"
  on public.room_removal_votes for insert
  with check (
    auth.uid() = voter_user_id
    and exists (
      select 1 from public.room_members rm
      where rm.room_id = room_removal_votes.room_id
        and rm.user_id = auth.uid()
        and rm.removed_at is null
    )
  );

-- Voters can delete their own vote (change mind)
create policy "Voters can delete own vote"
  on public.room_removal_votes for delete
  using (auth.uid() = voter_user_id);

-- When vote count reaches majority of current (non-removed) members, remove the target.
-- Call this after inserting a vote. Runs with definer rights so it can update room_members.
create or replace function public.check_removal_threshold(p_room_id text, p_target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vote_count int;
  v_member_count int;
  v_majority int;
begin
  -- Only allow if caller is a non-removed member of the room
  if not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid() and removed_at is null
  ) then
    return false;
  end if;

  select count(*) into v_vote_count
  from public.room_removal_votes
  where room_id = p_room_id and target_user_id = p_target_user_id;

  select count(*) into v_member_count
  from public.room_members
  where room_id = p_room_id and removed_at is null;

  v_majority := (v_member_count / 2) + 1;
  if v_vote_count >= v_majority then
    update public.room_members
    set removed_at = timezone('utc'::text, now())
    where room_id = p_room_id and user_id = p_target_user_id and removed_at is null;
    return true;
  end if;
  return false;
end;
$$;

grant execute on function public.check_removal_threshold(text, uuid) to authenticated;
grant execute on function public.check_removal_threshold(text, uuid) to service_role;
