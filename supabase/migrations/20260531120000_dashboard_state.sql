-- Bảng lưu toàn bộ dữ liệu dashboard của mỗi người dùng (1 dòng JSONB / user).
-- Chạy trong Supabase SQL Editor, hoặc qua `supabase db push` nếu dùng CLI.

create table if not exists public.dashboard_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.dashboard_state enable row level security;

-- Mỗi user chỉ truy cập dòng của chính mình.
create policy "own_select" on public.dashboard_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "own_insert" on public.dashboard_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "own_update" on public.dashboard_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Bật Realtime cho bảng (đồng bộ đa thiết bị).
alter publication supabase_realtime add table public.dashboard_state;
