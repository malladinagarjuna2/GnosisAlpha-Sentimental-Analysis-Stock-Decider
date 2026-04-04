-- CreateEnum
CREATE TYPE "InvestHorizon" AS ENUM ('SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM');

-- AlterTable
ALTER TABLE "SocialChannel" ADD COLUMN     "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5;

-- CreateTable
CREATE TABLE "InvestorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "riskTolerance" INTEGER NOT NULL,
    "horizon" "InvestHorizon" NOT NULL,
    "capitalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestorProfile_userId_key" ON "InvestorProfile"("userId");

-- AddForeignKey
ALTER TABLE "InvestorProfile" ADD CONSTRAINT "InvestorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
