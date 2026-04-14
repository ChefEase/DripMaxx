-- Supabase RLS template for DripMaxx.
-- Review table and column names against your live schema before applying.

begin;

create schema if not exists app;

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select u.id
  from users u
  where u.auth_id::text = auth.uid()::text
  limit 1
$$;

alter table users enable row level security;
alter table user_profile enable row level security;
alter table outfits enable row level security;
alter table outfit_scores enable row level security;
alter table outfit_suggestions enable row level security;
alter table style_dna enable row level security;
alter table drip_score_history enable row level security;

drop policy if exists "users_select_own" on users;
create policy "users_select_own"
on users
for select
using (id = app.current_user_id());

drop policy if exists "users_update_own" on users;
create policy "users_update_own"
on users
for update
using (id = app.current_user_id())
with check (id = app.current_user_id());

drop policy if exists "user_profile_select_own" on user_profile;
create policy "user_profile_select_own"
on user_profile
for select
using (user_id = app.current_user_id());

drop policy if exists "user_profile_insert_own" on user_profile;
create policy "user_profile_insert_own"
on user_profile
for insert
with check (user_id = app.current_user_id());

drop policy if exists "user_profile_update_own" on user_profile;
create policy "user_profile_update_own"
on user_profile
for update
using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());

drop policy if exists "outfits_select_own" on outfits;
create policy "outfits_select_own"
on outfits
for select
using (user_id = app.current_user_id());

drop policy if exists "outfits_insert_own" on outfits;
create policy "outfits_insert_own"
on outfits
for insert
with check (user_id = app.current_user_id());

drop policy if exists "outfits_update_own" on outfits;
create policy "outfits_update_own"
on outfits
for update
using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());

drop policy if exists "outfits_delete_own" on outfits;
create policy "outfits_delete_own"
on outfits
for delete
using (user_id = app.current_user_id());

drop policy if exists "outfit_scores_select_own" on outfit_scores;
create policy "outfit_scores_select_own"
on outfit_scores
for select
using (
  exists (
    select 1
    from outfits o
    where o.id = outfit_id
      and o.user_id = app.current_user_id()
  )
);

drop policy if exists "outfit_suggestions_select_own" on outfit_suggestions;
create policy "outfit_suggestions_select_own"
on outfit_suggestions
for select
using (
  exists (
    select 1
    from outfits o
    where o.id = outfit_id
      and o.user_id = app.current_user_id()
  )
);

drop policy if exists "style_dna_select_own" on style_dna;
create policy "style_dna_select_own"
on style_dna
for select
using (user_id = app.current_user_id());

drop policy if exists "style_dna_upsert_own" on style_dna;
create policy "style_dna_upsert_own"
on style_dna
for all
using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());

drop policy if exists "drip_score_history_select_own" on drip_score_history;
create policy "drip_score_history_select_own"
on drip_score_history
for select
using (user_id = app.current_user_id());

-- Public-profile access should be served through a SECURITY DEFINER function or API layer,
-- not direct table access. Keep raw outfit tables private and expose only filtered/public rows.

commit;
