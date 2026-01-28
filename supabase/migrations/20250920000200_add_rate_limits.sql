create table if not exists rate_limits (
  ip text primary key,
  window_start timestamptz not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rate_limits_window_start_idx on rate_limits (window_start);
