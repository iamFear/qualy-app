begin;

create schema if not exists qualy;
revoke all on schema qualy from public;

create table qualy.users (
  id text primary key,
  email text unique,
  name text not null,
  password_hash text,
  demo_expires bigint
);

create table qualy.sessions (
  hash text primary key,
  owner text not null references qualy.users on delete cascade,
  expires bigint not null
);
create index sessions_owner on qualy.sessions (owner);
create index sessions_expires on qualy.sessions (expires);

create table qualy.workouts (
  owner text not null references qualy.users on delete cascade,
  id text not null,
  name text not null,
  day date not null,
  time time not null,
  duration integer not null check (duration between 1 and 600),
  category text not null,
  notes text not null,
  exercises jsonb not null check (jsonb_typeof(exercises) = 'array'),
  done boolean not null default false,
  primary key (owner, id)
);
create index workouts_day on qualy.workouts (owner, day, time);

create table qualy.habits (
  owner text not null references qualy.users on delete cascade,
  id text not null,
  name text not null,
  icon text not null,
  target integer not null check (target between 1 and 9999),
  unit text not null,
  note text not null,
  created_on date not null,
  archived_on date,
  sort_order bigint generated always as identity,
  primary key (owner, id)
);
create index habits_owner_order on qualy.habits (owner, sort_order);

create table qualy.habit_logs (
  owner text not null,
  habit_id text not null,
  day date not null,
  amount integer not null check (amount between 0 and 9999),
  primary key (owner, habit_id, day),
  foreign key (owner, habit_id) references qualy.habits on delete cascade
);
create index habit_logs_day on qualy.habit_logs (owner, day);

revoke all on all tables in schema qualy from public;
alter table qualy.users enable row level security;
alter table qualy.sessions enable row level security;
alter table qualy.workouts enable row level security;
alter table qualy.habits enable row level security;
alter table qualy.habit_logs enable row level security;

commit;
