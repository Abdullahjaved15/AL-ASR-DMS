const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Altering year columns to TEXT in Database...');
  
  await prisma.$executeRawUnsafe('ALTER TABLE "Seller" ALTER COLUMN "year" TYPE TEXT USING "year"::text;');
  console.log('✓ Seller.year -> TEXT');
  
  await prisma.$executeRawUnsafe('ALTER TABLE "Buyer" ALTER COLUMN "year" TYPE TEXT USING "year"::text;');
  console.log('✓ Buyer.year -> TEXT');
  
  await prisma.$executeRawUnsafe('ALTER TABLE "CurrentStock" ALTER COLUMN "year" TYPE TEXT USING "year"::text;');
  console.log('✓ CurrentStock.year -> TEXT');
  
  await prisma.$executeRawUnsafe('ALTER TABLE "Invoice" ALTER COLUMN "carYear" TYPE TEXT USING "carYear"::text;');
  console.log('✓ Invoice.carYear -> TEXT');

  console.log('\nAll year columns successfully altered to TEXT!');
}

main()
  .catch((err) => {
    console.error('Migration Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
