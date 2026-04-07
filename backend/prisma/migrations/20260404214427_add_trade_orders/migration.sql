-- CreateTable
CREATE TABLE "TradeOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "symbol" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" DOUBLE PRECISION,
    "kiteOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLACED',
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeOrder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TradeOrder" ADD CONSTRAINT "TradeOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
