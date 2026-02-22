-- ============================================================
-- Messagerie B2B : listes marques / boutiques via RPC (contourne RLS)
-- À exécuter dans Supabase → SQL Editor.
-- ============================================================
-- Si la RLS empêche toujours de voir les contreparties, ces
-- fonctions permettent de lister les boutiques publiées et les
-- marques pour tout utilisateur authentifié, sans clé service role.
--
-- Prérequis : showrooms.id et brands.id en bigint (comme la table conversations).
-- Si showrooms.id est en uuid, remplacez "id bigint" par "id uuid" dans get_showrooms_for_messaging.
-- ============================================================

-- Boutiques publiées (pour le modal côté marque)
create or replace function public.get_showrooms_for_messaging()
returns table (
  id bigint,
  name text,
  avatar_url text,
  owner_id uuid
)
language sql
security definer
set search_path = public
stable
as $$
  select s.id, s.name, s.avatar_url, s.owner_id
  from public.showrooms s
  where s.publication_status = 'published'
  order by s.name;
$$;

comment on function public.get_showrooms_for_messaging() is 'Liste des boutiques publiées pour la messagerie (contourne RLS).';

grant execute on function public.get_showrooms_for_messaging() to authenticated;

-- Marques (pour le modal côté boutique)
create or replace function public.get_brands_for_messaging()
returns table (
  id bigint,
  brand_name text,
  avatar_url text,
  owner_id uuid
)
language sql
security definer
set search_path = public
stable
as $$
  select b.id, b.brand_name, b.avatar_url, b.owner_id
  from public.brands b
  order by b.brand_name;
$$;

comment on function public.get_brands_for_messaging() is 'Liste des marques pour la messagerie (contourne RLS).';

grant execute on function public.get_brands_for_messaging() to authenticated;
