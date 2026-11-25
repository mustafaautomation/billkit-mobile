-- Billkit tenant schema shared with the web app.
-- Apply this in the companion Supabase project. The mobile app uses the anon
-- or publishable key only; Row Level Security is the authorization boundary.
-- Public invoice links and Stripe Checkout go through edge functions so the
-- service role never ships in the client.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  currency text not null default 'USD',
  tax_label text not null default 'Tax',
  default_tax_rate numeric(6,3) not null default 0,
  email text not null,
  address_line1 text not null default '',
  address_line2 text not null default '',
  city text not null default '',
  region text not null default '',
  postal_code text not null default '',
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'accountant', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text not null,
  company text not null default '',
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id),
  number text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'partial', 'paid', 'void')),
  issue_date date not null,
  due_date date not null,
  currency text not null,
  tax_rate numeric(6,3) not null default 0,
  notes text not null default '',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  tax_cents integer not null check (tax_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  public_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  sent_at timestamptz,
  viewed_at timestamptz,
  paid_at timestamptz,
  created_by uuid not null references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);

create table public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  sort_order integer not null default 0
);

create table public.invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type text not null check (type in ('created', 'sent', 'viewed', 'reminder', 'payment', 'void')),
  message text not null,
  actor_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  stripe_checkout_session_id text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  invoice_id uuid references public.invoices (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text not null,
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

create index organization_members_user_idx on public.organization_members (user_id);
create index invoices_org_idx on public.invoices (organization_id, issue_date desc);
create index customers_org_idx on public.customers (organization_id);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index payments_invoice_idx on public.payments (invoice_id);

-- Membership checks live in a private schema so policies can call them
-- without recursively evaluating RLS on organization_members.
create or replace function private.is_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_org
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.member_role(target_org uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.organization_members
  where organization_id = target_org
    and user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function private.is_member(uuid) from public;
revoke all on function private.member_role(uuid) from public;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.member_role(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.invoice_events enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select, insert, update on public.customers to authenticated;
grant select, insert, update on public.invoices to authenticated;
grant select, insert, update, delete on public.invoice_line_items to authenticated;
grant select, insert on public.invoice_events to authenticated;
grant select on public.payments to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, delete on public.push_tokens to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy organizations_select_member on public.organizations
  for select to authenticated
  using (private.is_member(id));

create policy organizations_update_admin on public.organizations
  for update to authenticated
  using (private.member_role(id) in ('owner', 'admin'))
  with check (private.member_role(id) in ('owner', 'admin'));

create policy members_select_same_org on public.organization_members
  for select to authenticated
  using (private.is_member(organization_id));

create policy customers_select_member on public.customers
  for select to authenticated
  using (private.is_member(organization_id) and private.member_role(organization_id) <> 'viewer');

create policy customers_write_staff on public.customers
  for insert to authenticated
  with check (private.member_role(organization_id) in ('owner', 'admin', 'accountant', 'member'));

create policy customers_update_staff on public.customers
  for update to authenticated
  using (private.member_role(organization_id) in ('owner', 'admin', 'accountant', 'member'))
  with check (private.member_role(organization_id) in ('owner', 'admin', 'accountant', 'member'));

create policy invoices_select_member on public.invoices
  for select to authenticated
  using (private.is_member(organization_id));

create policy invoices_insert_staff on public.invoices
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      private.member_role(organization_id) in ('owner', 'admin', 'accountant')
      or (private.member_role(organization_id) = 'member' and status = 'draft')
    )
  );

create policy invoices_update_senders on public.invoices
  for update to authenticated
  using (private.member_role(organization_id) in ('owner', 'admin', 'accountant'))
  with check (private.member_role(organization_id) in ('owner', 'admin', 'accountant'));

create policy lines_select_member on public.invoice_line_items
  for select to authenticated
  using (private.is_member(organization_id));

create policy lines_write_staff on public.invoice_line_items
  for insert to authenticated
  with check (private.member_role(organization_id) in ('owner', 'admin', 'accountant', 'member'));

create policy lines_update_staff on public.invoice_line_items
  for update to authenticated
  using (private.member_role(organization_id) in ('owner', 'admin', 'accountant', 'member'))
  with check (private.member_role(organization_id) in ('owner', 'admin', 'accountant', 'member'));

create policy lines_delete_staff on public.invoice_line_items
  for delete to authenticated
  using (private.member_role(organization_id) in ('owner', 'admin', 'accountant', 'member'));

create policy events_select_member on public.invoice_events
  for select to authenticated
  using (private.is_member(organization_id));

create policy events_insert_staff on public.invoice_events
  for insert to authenticated
  with check (
    private.member_role(organization_id) in ('owner', 'admin', 'accountant')
    or (private.member_role(organization_id) = 'member' and type = 'created')
  );

create policy payments_select_member on public.payments
  for select to authenticated
  using (private.is_member(organization_id));

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()) and private.is_member(organization_id));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy push_tokens_own on public.push_tokens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Payments and payment notifications are inserted by the Stripe webhook
-- edge function with the service role. Authenticated clients cannot insert them.
-- Anonymous clients have no table grants. Shared invoice reads and Checkout
-- session creation are edge functions, not open table policies.
