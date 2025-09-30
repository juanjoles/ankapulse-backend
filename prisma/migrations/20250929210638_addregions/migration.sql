-- AlterTable
ALTER TABLE "checks" ADD COLUMN     "regions" TEXT[] DEFAULT ARRAY[]::TEXT[];
