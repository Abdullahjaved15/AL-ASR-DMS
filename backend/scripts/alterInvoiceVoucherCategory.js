const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to Neon Postgres via Prisma...');

    const queries = [
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'SALES_RECEIPT';`,
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "payeeName" TEXT;`,
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "headOfAccount" TEXT;`,
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "inWords" TEXT;`,
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "bankStatus" TEXT;`,
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "chequeNo" TEXT;`,
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "dueDate" TEXT;`,
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "onAccount" TEXT;`,
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "accountOf" TEXT;`,
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "time" TEXT;`,
      `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "color" TEXT;`
    ];

    for (const q of queries) {
      await prisma.$executeRawUnsafe(q);
      console.log('Executed:', q);
    }

    console.log('✓ All voucher category columns added successfully!');
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
