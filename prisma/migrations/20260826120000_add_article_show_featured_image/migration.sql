-- Toggle for the article-page hero image. Listing thumbnails keep using
-- "featured_image" regardless, so an article can have a card thumbnail without
-- repeating the image at the top of the post (e.g. video articles that already
-- show a YouTube thumbnail).
ALTER TABLE "articles" ADD COLUMN "show_featured_image" BOOLEAN NOT NULL DEFAULT true;
