insert into public.profiles (user_id, email)
select id, coalesce(email, '')
from auth.users
on conflict (user_id) do nothing;

insert into public.user_preferences (user_id)
select id
from auth.users
on conflict (user_id) do nothing;
