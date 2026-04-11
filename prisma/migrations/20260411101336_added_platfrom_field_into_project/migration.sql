-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "platform" TEXT,
ALTER COLUMN "title" DROP NOT NULL;
