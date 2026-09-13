-- The `articles` table is defined in `prisma/schema.prisma` and applied with:
--   yarn prisma migrate deploy
-- (or `yarn prisma db push` in development). Do not duplicate DDL here.
-- This file is run manually in the Supabase SQL editor and must be re-run
-- after the `add_user_management` migration is deployed.

-- Storage: create bucket "article-images" (public) in Dashboard if needed, then:
insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

drop policy if exists "article_images_public_read" on storage.objects;

create policy "article_images_public_read"
  on storage.objects for select
  using (bucket_id = 'article-images');

drop policy if exists "article_images_authenticated_upload" on storage.objects;
drop policy if exists "article_images_authenticated_update" on storage.objects;
drop policy if exists "article_images_authenticated_delete" on storage.objects;
drop policy if exists "article_images_upload" on storage.objects;
drop policy if exists "article_images_update" on storage.objects;
drop policy if exists "article_images_delete" on storage.objects;

-- Drop the old (uid, perms) signature so callers cannot probe another user's
-- permissions. The replacement reads auth.uid() inside the function.
drop function if exists public.admin_has_any_permission(uuid, text[]);
drop function if exists public.admin_has_any_permission(text[]);

-- Admin permission check for storage policies (see src/lib/permissions.ts).
-- True when the caller is active (not disabled, no pending password change) and
-- holds the super-admin role or any of `perms`. security definer so it can read
-- the RLS-protected access tables.
create function public.admin_has_any_permission(perms text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users u
    join public.user_roles ur on ur.user_id = u.id
    join public.roles r on r.id = ur.role_id
    left join public.role_permissions rp on rp.role_id = r.id
    where u.id = auth.uid()
      and not u.disabled
      and not u.must_change_password
      and (r.key = 'super-admin' or rp.permission = any (perms))
  );
$$;

revoke all on function public.admin_has_any_permission(text[]) from public, anon;
grant execute on function public.admin_has_any_permission(text[]) to authenticated;

-- Uploads: media library/editor (media.upload) and legacy import rehosting (import.run).
create policy "article_images_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'article-images'
    and public.admin_has_any_permission(array['media.upload', 'import.run'])
  );

create policy "article_images_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'article-images'
    and public.admin_has_any_permission(array['media.upload', 'import.run'])
  )
  with check (
    bucket_id = 'article-images'
    and public.admin_has_any_permission(array['media.upload', 'import.run'])
  );

create policy "article_images_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'article-images'
    and public.admin_has_any_permission(array['media.delete'])
  );
