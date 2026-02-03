-- Optional focus keyword field for posts (safe migration)

alter table public.posts
  add column if not exists focus_keyword text;

update public.posts
  set focus_keyword = target_keyword
where focus_keyword is null and target_keyword is not null;

notify pgrst, 'reload schema';
