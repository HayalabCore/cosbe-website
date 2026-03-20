-- The `articles` table is defined in `prisma/schema.prisma` and applied with:
--   yarn prisma migrate deploy
-- (or `yarn prisma db push` in development). Do not duplicate DDL here.

-- Storage: create bucket "article-images" (public) in Dashboard if needed, then:
insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

create policy "article_images_public_read"
  on storage.objects for select
  using (bucket_id = 'article-images');

create policy "article_images_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'article-images');

create policy "article_images_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'article-images');

create policy "article_images_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'article-images');
