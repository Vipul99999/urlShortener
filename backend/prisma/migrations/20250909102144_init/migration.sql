-- CreateTable
CREATE TABLE "ShortUrl" (
    "id" TEXT NOT NULL,
    "shortcode" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortUrl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Click" (
    "id" TEXT NOT NULL,
    "shortUrlId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "country" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Click_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShortUrl_shortcode_key" ON "ShortUrl"("shortcode");

-- AddForeignKey
ALTER TABLE "Click" ADD CONSTRAINT "Click_shortUrlId_fkey" FOREIGN KEY ("shortUrlId") REFERENCES "ShortUrl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
