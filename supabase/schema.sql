-- ============================================================
-- Trokémon : schéma Supabase (bêta)
-- À coller en entier dans Supabase > SQL Editor > New query > Run.
-- Peut être relancé sans risque : tout est "if not exists" ou "or replace".
-- ============================================================

-- ---------- Profils ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  pseudo      text not null check (char_length(pseudo) between 3 and 20),
  avatar_url  text,
  energy      text,
  zone_label  text,
  zone_lat    double precision,
  zone_lng    double precision,
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index if not exists profiles_pseudo_lower on public.profiles (lower(pseudo));
create index if not exists profiles_zone on public.profiles (zone_lat, zone_lng);

-- La zone est arrondie côté serveur (grille de 0,02° soit environ 2 km) :
-- même un client modifié ne peut jamais stocker une position précise.
create or replace function public.round_zone() returns trigger
language plpgsql as $$
begin
  if new.zone_lat is not null then new.zone_lat := round(new.zone_lat * 50) / 50; end if;
  if new.zone_lng is not null then new.zone_lng := round(new.zone_lng * 50) / 50; end if;
  return new;
end $$;
drop trigger if exists profiles_round_zone on public.profiles;
create trigger profiles_round_zone before insert or update on public.profiles
  for each row execute function public.round_zone();

-- Création automatique du profil à l'inscription (pseudo pris dans les métadonnées).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; cand text;
begin
  base := left(regexp_replace(coalesce(new.raw_user_meta_data->>'pseudo', split_part(new.email, '@', 1)), '[^[:alnum:]_.-]', '', 'g'), 16);
  if char_length(base) < 3 then base := 'dresseur'; end if;
  cand := base;
  while exists (select 1 from public.profiles where lower(pseudo) = lower(cand)) loop
    cand := base || (floor(random() * 900) + 100)::int::text;
  end loop;
  insert into public.profiles (id, pseudo) values (new.id, cand);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Vérification de disponibilité du pseudo, appelable avant l'inscription.
create or replace function public.pseudo_available(p text) returns boolean
language sql security definer set search_path = public stable as $$
  select not exists (select 1 from public.profiles where lower(pseudo) = lower(p));
$$;
grant execute on function public.pseudo_available(text) to anon, authenticated;

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Cartes et produits (je propose / je recherche) ----------
create table if not exists public.items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  kind           text not null check (kind in ('offer', 'want')),
  type           text not null check (type in ('loose', 'graded', 'sealed')),
  match_key      text not null,
  name           text not null check (char_length(name) between 1 and 120),
  number         text,
  set_id         text,
  set_name       text,
  card_id        text,
  catalog_image  text,
  condition      text,
  grade_company  text,
  grade          text,
  cert           text,
  value_eur      numeric(10,2),
  value_source   text,
  value_at       timestamptz,
  photo_front    text,
  photo_back     text,
  notes          text check (char_length(notes) <= 500),
  status         text not null default 'active' check (status in ('active', 'traded')),
  created_at     timestamptz not null default now(),
  -- Règle de la bêta : un item proposé doit avoir une photo recto ET verso.
  constraint offer_has_photos check (kind <> 'offer' or (photo_front is not null and photo_back is not null))
);
create index if not exists items_user on public.items (user_id);
create index if not exists items_match on public.items (match_key);

alter table public.items enable row level security;
drop policy if exists items_select on public.items;
create policy items_select on public.items for select to authenticated
  using (status = 'active' or user_id = auth.uid());
drop policy if exists items_insert_own on public.items;
create policy items_insert_own on public.items for insert to authenticated with check (user_id = auth.uid());
drop policy if exists items_update_own on public.items;
create policy items_update_own on public.items for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists items_delete_own on public.items;
create policy items_delete_own on public.items for delete to authenticated using (user_id = auth.uid());

-- ---------- Propositions d'échange ----------
create table if not exists public.proposals (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null,
  to_user     uuid not null,
  give        jsonb not null,   -- photo instantanée des items donnés (nom, numéro, valeur figée)
  get         jsonb not null,   -- photo instantanée des items reçus
  give_value  numeric(10,2),
  get_value   numeric(10,2),
  handover    text not null default 'main' check (handover in ('main', 'envoi')),
  status      text not null default 'sent' check (status in ('sent', 'accepted', 'declined', 'cancelled', 'done')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint proposals_from_fkey foreign key (from_user) references public.profiles(id) on delete cascade,
  constraint proposals_to_fkey   foreign key (to_user)   references public.profiles(id) on delete cascade,
  constraint proposals_distinct  check (from_user <> to_user)
);
create index if not exists proposals_from on public.proposals (from_user);
create index if not exists proposals_to on public.proposals (to_user);

-- Seul le statut peut changer après l'envoi.
create or replace function public.proposals_guard() returns trigger
language plpgsql as $$
begin
  if new.from_user <> old.from_user or new.to_user <> old.to_user or new.give <> old.give
     or new.get <> old.get or new.handover <> old.handover or new.created_at <> old.created_at then
    raise exception 'Seul le statut d''une proposition peut être modifié';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists proposals_guard on public.proposals;
create trigger proposals_guard before update on public.proposals
  for each row execute function public.proposals_guard();

alter table public.proposals enable row level security;
drop policy if exists proposals_select on public.proposals;
create policy proposals_select on public.proposals for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());
drop policy if exists proposals_insert on public.proposals;
create policy proposals_insert on public.proposals for insert to authenticated
  with check (from_user = auth.uid() and status = 'sent');
drop policy if exists proposals_update_to on public.proposals;
create policy proposals_update_to on public.proposals for update to authenticated
  using (to_user = auth.uid()) with check (to_user = auth.uid() and status in ('accepted', 'declined', 'done'));
drop policy if exists proposals_update_from on public.proposals;
create policy proposals_update_from on public.proposals for update to authenticated
  using (from_user = auth.uid()) with check (from_user = auth.uid() and status in ('cancelled', 'done'));

-- ---------- Messages d'une proposition ----------
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  proposal_id  uuid not null references public.proposals(id) on delete cascade,
  sender       uuid not null references public.profiles(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 1000),
  created_at   timestamptz not null default now()
);
create index if not exists messages_proposal on public.messages (proposal_id, created_at);

alter table public.messages enable row level security;
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (exists (select 1 from public.proposals p where p.id = proposal_id and (p.from_user = auth.uid() or p.to_user = auth.uid())));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (sender = auth.uid() and exists (select 1 from public.proposals p where p.id = proposal_id and (p.from_user = auth.uid() or p.to_user = auth.uid())));

-- ---------- Stockage des photos ----------
-- Bucket public en lecture (les photos de cartes sont faites pour être vues).
-- Chaque utilisateur n'écrit que dans son propre dossier : photos/<son id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects for select using (bucket_id = 'photos');
drop policy if exists photos_insert_own on storage.objects;
create policy photos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists photos_update_own on storage.objects;
create policy photos_update_own on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists photos_delete_own on storage.objects;
create policy photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Estimations : API (cardmarket) ou saisie personnelle du propriétaire (user) ----------
alter table public.items drop constraint if exists items_value_source_check;
update public.items set value_eur = null, value_source = null, value_at = null
  where value_source is not null and value_source not in ('cardmarket', 'tcgplayer', 'user');
alter table public.items add constraint items_value_source_check
  check (value_source is null or value_source in ('cardmarket', 'tcgplayer', 'user'));

-- ---------- Avis après un échange ----------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  reviewer    uuid not null references public.profiles(id) on delete cascade,
  reviewed    uuid not null references public.profiles(id) on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  comment     text check (comment is null or char_length(comment) <= 500),
  created_at  timestamptz not null default now(),
  unique (proposal_id, reviewer),
  check (reviewer <> reviewed)
);
create index if not exists reviews_reviewed_idx on public.reviews (reviewed, created_at desc);
alter table public.reviews enable row level security;

-- Lecture : tout membre connecté peut lire les avis.
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select to authenticated using (true);
-- Écriture : seulement sur un échange terminé dont on est l'un des deux participants,
-- et seulement à propos de l'autre participant.
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated
  with check (
    reviewer = auth.uid()
    and exists (
      select 1 from public.proposals p
      where p.id = proposal_id and p.status = 'done'
        and ((p.from_user = auth.uid() and p.to_user = reviewed)
          or (p.to_user = auth.uid() and p.from_user = reviewed))
    )
  );
-- Pas de modification ni de suppression (un avis est définitif).

-- Statistiques publiques d'un profil : échanges terminés, note moyenne, nombre d'avis.
create or replace function public.profile_stats(p uuid)
returns table (done_count int, rating_avg numeric, rating_count int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from public.proposals where status = 'done' and (from_user = p or to_user = p)),
    (select round(avg(rating)::numeric, 2) from public.reviews where reviewed = p),
    (select count(*)::int from public.reviews where reviewed = p);
$$;
grant execute on function public.profile_stats(uuid) to authenticated;

-- ---------- Recherche d'un item (nom, extension ou numéro) sur toute la carte ----------
create extension if not exists unaccent with schema extensions;

create or replace function public.search_items(q text, lim int default 200)
returns setof public.items
language sql stable security invoker set search_path = public, extensions as $$
  select i.* from public.items i
  where i.status = 'active'
    and i.user_id is distinct from auth.uid()
    and char_length(trim(q)) >= 1
    and (
      case
        when trim(q) ~ '^#?[0-9]+(/[0-9]+)?$' then
          regexp_replace(coalesce(i.number, ''), '^0+', '') like
            regexp_replace(regexp_replace(trim(q), '^#', ''), '^0+', '') || (case when q like '%/%' then '' else '/%' end)
        else
          unaccent(i.name) ilike '%' || unaccent(trim(q)) || '%'
          or unaccent(coalesce(i.set_name, '')) ilike '%' || unaccent(trim(q)) || '%'
      end
    )
  limit least(coalesce(lim, 200), 300);
$$;
grant execute on function public.search_items(text, int) to authenticated;

-- ---------- v3 : sigle de série, version (reverse, motif…), photos facultatives pour les cartes courantes ----------
alter table public.items add column if not exists set_abbr text;
alter table public.items add column if not exists variant text;
alter table public.items add column if not exists photo_optional boolean not null default false;

alter table public.items drop constraint if exists offer_has_photos;
alter table public.items add constraint offer_has_photos
  check (kind <> 'offer' or photo_optional or (photo_front is not null and photo_back is not null));
alter table public.items drop constraint if exists photo_optional_loose_only;
alter table public.items add constraint photo_optional_loose_only
  check (not photo_optional or type = 'loose');

-- Recherche d'item : chaque mot de la recherche (nom, sigle de série, numéro, extension) doit se retrouver.
create or replace function public.search_items(q text, lim int default 200)
returns setof public.items
language sql stable security invoker set search_path = public, extensions as $$
  select i.* from public.items i
  where i.status = 'active'
    and i.user_id is distinct from auth.uid()
    and char_length(trim(q)) >= 1
    and not exists (
      select 1 from regexp_split_to_table(trim(q), '[\s\-\(\)#]+') as t(w)
      where w <> ''
        and unaccent(concat_ws(' ', i.name, i.set_abbr, i.set_name, i.number, i.variant)) not ilike '%' || unaccent(w) || '%'
    )
  limit least(coalesce(lim, 200), 300);
$$;
grant execute on function public.search_items(text, int) to authenticated;

-- Vitrine de l'accueil : quelques cartes récemment proposées, visibles sans compte.
-- Aucune donnée personnelle : ni pseudo, ni identifiant, ni coordonnées ; seulement la ville de la zone.
create or replace function public.showcase(n int default 8)
returns table (name text, number text, set_name text, set_abbr text, variant text, image text, zone_label text)
language sql stable security definer set search_path = public as $$
  select t.name, t.number, t.set_name, t.set_abbr, t.variant, t.image, t.zone_label from (
    select distinct on (i.user_id)
      i.name, i.number, i.set_name, i.set_abbr, i.variant,
      coalesce(i.photo_front, i.catalog_image) as image, p.zone_label, i.created_at
    from public.items i join public.profiles p on p.id = i.user_id
    where i.kind = 'offer' and i.status = 'active' and p.zone_label is not null
      and coalesce(i.photo_front, i.catalog_image) is not null
    order by i.user_id, i.created_at desc
  ) t
  order by t.created_at desc
  limit least(coalesce(n, 8), 12);
$$;
grant execute on function public.showcase(int) to anon, authenticated;

-- recharge le cache de schéma de l'API (évite « could not find the column … in the schema cache »)


-- énergie non choisie = null (l'app affiche alors le jaune de base)
alter table public.profiles alter column energy drop not null;
alter table public.profiles alter column energy drop default;
notify pgrst, 'reload schema';


-- Photos d'une même carte déjà postées par un utilisateur : servent d'image quand le catalogue n'en a pas.
create or replace function public.card_photos(ids text[])
returns table(card_id text, photo text)
language sql stable security definer set search_path = public as $$
  select distinct on (i.card_id) i.card_id, i.photo_front
  from public.items i
  where i.card_id = any(ids) and i.photo_front is not null and i.status = 'active'
  order by i.card_id, i.created_at desc
$$;
grant execute on function public.card_photos(text[]) to authenticated;


-- ---------- Rendez-vous et double confirmation d'un échange ----------
alter table public.proposals add column if not exists meeting jsonb;            -- {place, at, by, status: proposed|accepted|declined}
alter table public.proposals add column if not exists confirm_from boolean not null default false;
alter table public.proposals add column if not exists confirm_to boolean not null default false;

-- Le rendez-vous, les confirmations et le passage à « done » ne se font que par les fonctions ci-dessous.
create or replace function public.proposals_guard() returns trigger
language plpgsql as $$
begin
  if new.from_user <> old.from_user or new.to_user <> old.to_user or new.give <> old.give
     or new.get <> old.get or new.handover <> old.handover or new.created_at <> old.created_at then
    raise exception 'Seul le statut d''une proposition peut être modifié';
  end if;
  if coalesce(current_setting('trokemon.rpc', true), '') <> '1' then
    if new.meeting is distinct from old.meeting or new.confirm_from <> old.confirm_from
       or new.confirm_to <> old.confirm_to or (new.status = 'done' and old.status <> 'done') then
      raise exception 'Utilise les boutons de l''échange pour fixer le rendez-vous ou confirmer';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.propose_meeting(pid uuid, place text, at timestamptz)
returns public.proposals language plpgsql security definer set search_path = public as $$
declare p public.proposals;
begin
  select * into p from public.proposals where id = pid;
  if not found or (p.from_user <> auth.uid() and p.to_user <> auth.uid()) then raise exception 'Échange introuvable'; end if;
  if p.status <> 'accepted' then raise exception 'Le rendez-vous se fixe une fois la proposition acceptée'; end if;
  if char_length(trim(coalesce(place, ''))) = 0 then raise exception 'Indique un lieu'; end if;
  perform set_config('trokemon.rpc', '1', true);
  update public.proposals set meeting = jsonb_build_object('place', left(trim(place), 200), 'at', at, 'by', auth.uid(), 'status', 'proposed')
    where id = pid returning * into p;
  return p;
end $$;

create or replace function public.answer_meeting(pid uuid, accept boolean)
returns public.proposals language plpgsql security definer set search_path = public as $$
declare p public.proposals;
begin
  select * into p from public.proposals where id = pid;
  if not found or (p.from_user <> auth.uid() and p.to_user <> auth.uid()) then raise exception 'Échange introuvable'; end if;
  if p.meeting is null or p.meeting->>'status' <> 'proposed' then raise exception 'Aucun rendez-vous à valider'; end if;
  if (p.meeting->>'by')::uuid = auth.uid() then raise exception 'Seule l''autre personne peut répondre à ton rendez-vous'; end if;
  perform set_config('trokemon.rpc', '1', true);
  update public.proposals set meeting = jsonb_set(meeting, '{status}', to_jsonb(case when accept then 'accepted' else 'declined' end))
    where id = pid returning * into p;
  return p;
end $$;

create or replace function public.confirm_exchange(pid uuid)
returns public.proposals language plpgsql security definer set search_path = public as $$
declare p public.proposals; r record;
begin
  select * into p from public.proposals where id = pid;
  if not found or (p.from_user <> auth.uid() and p.to_user <> auth.uid()) then raise exception 'Échange introuvable'; end if;
  if p.status <> 'accepted' then raise exception 'Cet échange n''est pas en cours'; end if;
  perform set_config('trokemon.rpc', '1', true);
  if p.from_user = auth.uid() then update public.proposals set confirm_from = true where id = pid returning * into p;
  else update public.proposals set confirm_to = true where id = pid returning * into p; end if;
  if p.confirm_from and p.confirm_to then
    update public.proposals set status = 'done' where id = pid returning * into p;
    -- items échangés : retirés de « Je propose » chez leur propriétaire…
    update public.items set status = 'traded'
      where status = 'active' and (
        (user_id = p.from_user and id in (select (x->>'id')::uuid from jsonb_array_elements(p.give) x where x ? 'id'))
        or (user_id = p.to_user and id in (select (x->>'id')::uuid from jsonb_array_elements(p.get) x where x ? 'id')));
    -- …et la même carte est retirée de « Je recherche » chez celui qui la reçoit (une ligne par carte reçue).
    for r in select i.match_key, i.user_id from public.items i
             where i.id in (select (x->>'id')::uuid from jsonb_array_elements(p.give) x where x ? 'id')
                or i.id in (select (x->>'id')::uuid from jsonb_array_elements(p.get) x where x ? 'id') loop
      update public.items set status = 'traded' where id = (
        select w.id from public.items w
        where w.kind = 'want' and w.status = 'active' and w.match_key = r.match_key
          and w.user_id = case when r.user_id = p.from_user then p.to_user else p.from_user end
        limit 1);
    end loop;
  end if;
  return p;
end $$;

grant execute on function public.propose_meeting(uuid, text, timestamptz) to authenticated;
grant execute on function public.answer_meeting(uuid, boolean) to authenticated;
grant execute on function public.confirm_exchange(uuid) to authenticated;
