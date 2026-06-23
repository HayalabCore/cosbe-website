-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "ai_models" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "client_location" TEXT,
ADD COLUMN     "client_name" TEXT,
ADD COLUMN     "client_url" TEXT,
ADD COLUMN     "main_challenges" TEXT;
