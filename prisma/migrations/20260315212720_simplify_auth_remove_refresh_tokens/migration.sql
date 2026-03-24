/*
  Warnings:

  - You are about to drop the `RefreshToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE IF EXISTS "RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "RefreshToken";
