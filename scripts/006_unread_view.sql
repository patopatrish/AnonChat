-- View: per-user unread counts for rooms
create or replace view public.user_room_unreads as
select
  rm.user_id,
  r.id as room_id,
  count(m.id) as unread_count
from public.rooms r
left join public.room_members rm on rm.room_id = r.id
left join public.messages m on m.room_id = r.id
  and (rm.last_read_at is null or m.created_at > rm.last_read_at)
group by rm.user_id, r.id;

grant select on public.user_room_unreads to public;
