create extension if not exists "pgcrypto";

create table if not exists classes (
  class_code text primary key,
  name text not null,
  teacher_code_hash text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  class_code text not null references classes(class_code) on delete cascade,
  student_code_hash text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create unique index if not exists students_class_code_student_code_hash_key
  on students (class_code, student_code_hash);

create table if not exists sessions (
  token_hash text primary key,
  student_id uuid not null references students(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists progress (
  student_id uuid not null references students(id) on delete cascade,
  activity_id text not null,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (student_id, activity_id)
);
