-- AlterTable
ALTER TABLE "Content" ALTER COLUMN "manifestUrl" SET DEFAULT '';

-- AlterTable
ALTER TABLE "VideoSourceInfo" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;
