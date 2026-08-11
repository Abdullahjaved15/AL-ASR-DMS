const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function purge() {
  console.log('🧹 Starting purge of Excel/PDF imported leads...');

  const deletedSellers = await prisma.seller.deleteMany({
    where: {
      OR: [
        { leadSource: 'Excel Import' },
        { leadSource: 'PDF Import' }
      ]
    }
  });

  const deletedBuyers = await prisma.buyer.deleteMany({
    where: {
      OR: [
        { leadSource: 'Excel Import' },
        { leadSource: 'PDF Import' }
      ]
    }
  });

  const remainingSellers = await prisma.seller.count();
  const remainingBuyers = await prisma.buyer.count();

  console.log(`\n✅ PURGE COMPLETED SUCCESSFULLY!`);
  console.log(`- Removed ${deletedSellers.count} Excel/PDF Seller leads.`);
  console.log(`- Removed ${deletedBuyers.count} Excel/PDF Buyer leads.`);
  console.log(`\n📌 PRESERVED SUPER ADMIN / MANUAL LEADS:`);
  console.log(`- Remaining Sellers in Database: ${remainingSellers}`);
  console.log(`- Remaining Buyers in Database: ${remainingBuyers}`);
}

purge()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
