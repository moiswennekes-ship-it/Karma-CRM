-- ============================================================
-- KARMA CRM — SUPABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── GUESTS ──────────────────────────────────────────────────
create table if not exists guests (
  id            uuid primary key default uuid_generate_v4(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),

  -- Identity
  name          text not null,
  initials      text not null,
  email         text,
  whatsapp      text,

  -- Membership
  membership    text not null,         -- e.g. "198 Bi-Annual Points"
  member_type   text not null,         -- Legacy Member / Fractional Owner / etc.
  status        text not null default 'Arriving Soon',
  upgrade_score integer default 50 check (upgrade_score between 0 and 100),

  -- Stay
  arrival_date  text,                  -- kept as text for display flexibility
  depart_date   text,
  nights        integer default 7,
  party         text,                  -- "Couple + 2 kids"
  last_stay     text,                  -- "3 years ago"

  -- Notes & meta
  notes         text default '',
  color_index   integer default 0,
  tags          text[] default '{}'    -- ["hot","arriving","followup"]
);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger guests_updated_at
  before update on guests
  for each row execute procedure update_updated_at();

-- ── INTERACTIONS ─────────────────────────────────────────────
-- Every touchpoint: message sent, meeting held, note added, status changed
create table if not exists interactions (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz default now(),
  guest_id    uuid references guests(id) on delete cascade,
  type        text not null,   -- 'whatsapp' | 'email' | 'meeting' | 'note' | 'status_change' | 'proposal'
  content     text,            -- message body, meeting notes, etc.
  ai_generated boolean default false,
  staff_name  text default 'James Reid'
);

-- ── AI MESSAGES ──────────────────────────────────────────────
-- Archive of every AI-generated message for learning & reuse
create table if not exists ai_messages (
  id            uuid primary key default uuid_generate_v4(),
  created_at    timestamptz default now(),
  guest_id      uuid references guests(id) on delete cascade,
  message_type  text not null,   -- 'welcome_whatsapp' | 'welcome_email' | 'followup' | 'meeting_prep' | 'proposal' | 'objection'
  prompt_used   text,
  output        text not null,
  tone          text,
  was_sent      boolean default false,
  rating        integer          -- 1-5 staff rating for quality feedback loop
);

-- ── OBJECTIONS ───────────────────────────────────────────────
create table if not exists objection_responses (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz default now(),
  guest_id    uuid references guests(id) on delete set null,
  objection   text not null,
  context     text,
  tone        text,
  response    text not null,
  was_used    boolean default false
);

-- ── STAFF ────────────────────────────────────────────────────
create table if not exists staff (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz default now(),
  name        text not null,
  email       text unique not null,
  role        text default 'Member Relations',
  property    text default 'Karma Kandara, Bali',
  avatar_initials text
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
-- Enable RLS on all tables (when you add auth, tighten these policies)
alter table guests enable row level security;
alter table interactions enable row level security;
alter table ai_messages enable row level security;
alter table objection_responses enable row level security;
alter table staff enable row level security;

-- For now: allow all authenticated users full access
-- When you add Supabase Auth, replace 'true' with auth.uid() checks
create policy "Allow all for authenticated" on guests for all using (true);
create policy "Allow all for authenticated" on interactions for all using (true);
create policy "Allow all for authenticated" on ai_messages for all using (true);
create policy "Allow all for authenticated" on objection_responses for all using (true);
create policy "Allow all for authenticated" on staff for all using (true);

-- ── INDEXES ──────────────────────────────────────────────────
create index if not exists idx_guests_status on guests(status);
create index if not exists idx_guests_arrival on guests(arrival_date);
create index if not exists idx_interactions_guest on interactions(guest_id);
create index if not exists idx_ai_messages_guest on ai_messages(guest_id);

-- ── SEED DATA ────────────────────────────────────────────────
insert into guests (name, initials, email, whatsapp, membership, member_type, status, upgrade_score, arrival_date, depart_date, nights, party, last_stay, notes, color_index, tags) values
(
  'John & Sarah Smith', 'JS',
  'john.smith@email.com', '+61 422 345 678',
  '198 Bi-Annual Points', 'Legacy Member',
  'Arriving Soon', 82,
  'Today, 2:00 PM', 'Jun 1', 7,
  'Couple + 2 kids', '3 years ago',
  'Has not used membership in years. Legacy points system, maintenance fees rising. Strong fractional conversion candidate.',
  0, '{arriving}'
),
(
  'David Chen', 'DC',
  'd.chen@chengroup.com', '+65 9123 4567',
  'Fractional — Karma Kandara', 'Fractional Owner',
  'Hot Lead', 71,
  'Today, 4:30 PM', 'May 28', 3,
  'Solo business', '6 months ago',
  'High net worth. Interested in adding a 2nd fractional week. Singapore based, frequent traveller.',
  1, '{arriving,hot}'
),
(
  'Emma & Paul Watson', 'EW',
  'emma.watson@email.co.uk', '+44 7700 900123',
  '96 Annual Points', 'Standard Member',
  'Meeting Booked', 65,
  'May 27', 'Jun 3', 7,
  'Couple', '1 year ago',
  'Meeting booked 10:30 AM tomorrow. Raised concerns about maintenance fees last stay. Need to address value prop.',
  2, '{followup}'
),
(
  'Raj Sharma', 'RS',
  'raj.sharma@techcorp.in', '+91 98765 43210',
  '48 Annual Points', 'Entry Member',
  'Follow-Up', 44,
  'May 26', 'May 30', 4,
  'Family of 4', '2 years ago',
  'Met briefly. Interested but said not the right time. Follow up with a lifestyle-focused message.',
  3, '{followup}'
),
(
  'Sophie & Marc Laurent', 'SL',
  'slaurent@mail.fr', '+33 6 12 34 56 78',
  'Fractional — Karma Jimbaran', 'Fractional Owner',
  'Arriving Soon', 28,
  'Today, 11:00 AM', 'Jun 7', 14,
  'Couple', '1 year ago',
  'Regular fractional owners. Very happy with property. Long 14-night stay. High referral value.',
  4, '{arriving}'
),
(
  'Michael Thornton', 'MT',
  'm.thornton@thorntonvc.com', '+1 415 555 0199',
  '288 Bi-Annual Points', 'Premium Legacy',
  'Hot Lead', 88,
  'May 28', 'Jun 4', 7,
  'Family of 5', '4 years ago',
  'US-based VC. Points never used. Paying high legacy maintenance fees. Extremely high conversion potential — book meeting today.',
  0, '{hot,followup}'
);

insert into staff (name, email, role, property, avatar_initials) values
('James Reid', 'james.reid@karma.com', 'Member Relations', 'Karma Kandara, Bali', 'JR');
