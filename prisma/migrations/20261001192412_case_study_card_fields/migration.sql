-- Case-study card copy: industry and the 独自価値/課題/解決/結果 bullets, each
-- with an English twin (main_challenges already holds 課題 in Japanese).
ALTER TABLE "articles" ADD COLUMN     "industry" TEXT,
ADD COLUMN     "industry_en" TEXT,
ADD COLUMN     "main_challenges_en" TEXT,
ADD COLUMN     "result" TEXT,
ADD COLUMN     "result_en" TEXT,
ADD COLUMN     "solution" TEXT,
ADD COLUMN     "solution_en" TEXT,
ADD COLUMN     "unique_value" TEXT,
ADD COLUMN     "unique_value_en" TEXT;
