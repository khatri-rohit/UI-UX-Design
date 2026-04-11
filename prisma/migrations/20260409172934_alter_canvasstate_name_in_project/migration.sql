/*
  Warnings:

  - You are about to drop the column `canvas_state` on the `Projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Projects" DROP COLUMN "canvas_state",
ADD COLUMN     "canvasState" JSONB;
