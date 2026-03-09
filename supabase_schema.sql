-- Supabase schema for TempTagBot configuration
-- Run this in the Supabase SQL editor, then add your env vars.

-- Products offered by the bot (shown as inline buttons)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  price_cents integer not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_sort_idx on public.products (sort_order asc);

-- Singleton settings row for Telegram integration
create table if not exists public.telegram_settings (
  id integer primary key default 1,
  admin_group_id bigint,
  description text
);

-- Stripe checkout sessions: bot stores session_id -> telegram_chat_id for webhook
create table if not exists public.stripe_sessions (
  id text primary key,
  telegram_chat_id bigint not null,
  product_code text not null,
  created_at timestamptz not null default now()
);

-- RLS: enable on all tables
alter table public.products enable row level security;
alter table public.telegram_settings enable row level security;
alter table public.stripe_sessions enable row level security;

-- Policies for dashboard (anon key): allow read/write on products and telegram_settings.
-- For production, switch to Supabase Auth and restrict to authenticated users.
create policy "Products read write for anon"
  on public.products for all using (true) with check (true);

create policy "Telegram settings read write for anon"
  on public.telegram_settings for all using (true) with check (true);

-- stripe_sessions: service role only (bot and webhook use service key). No anon policy.
-- Bot inserts via SUPABASE_SERVICE_KEY; webhook API reads/deletes via same key.

insert into public.products (code, label, price_cents, sort_order, active)
values
  ('150', 'Temp Tag Only – $150', 15000, 1, true),
  ('100', 'Insurance Only – $100', 10000, 2, true),
  ('250', 'Temp Tag + Insurance – $250', 25000, 3, true)
on conflict (code) do nothing;

insert into public.telegram_settings (id, admin_group_id)
values (1, null)
on conflict (id) do nothing;

