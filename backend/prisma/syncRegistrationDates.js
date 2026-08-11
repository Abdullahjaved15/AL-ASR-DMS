const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sync() {
  console.log('🔄 Verifying and syncing all Seller and Buyer registration dates...');

  // Update Sellers where registrationDate is null or equals createdAt
  const sellers = await prisma.seller.findMany({
    select: { id: true, registrationDate: true, createdAt: true }
  });

  let sellerUpdated = 0;
  for (const s of sellers) {
    if (!s.registrationDate) {
      await prisma.seller.update({
        where: { id: s.id },
        data: { registrationDate: s.createdAt }
      });
      sellerUpdated++;
    }
  }

  // Update Buyers where registrationDate is null or equals createdAt
  const buyers = await prisma.buyer.findMany({
    select: { id: true, registrationDate: true, createdAt: true }
  });

  let buyerUpdated = 0;
  for (const b of buyers) {
    if (!b.registrationDate) {
      await prisma.buyer.update({
        where: { id: b.id },
        data: { registrationDate: b.createdAt }
      });
      buyerUpdated++;
    }
  }

  console.log(`✅ Verified ${sellers.length} Sellers (${sellerUpdated} updated).`);
  console.log(`✅ Verified ${buyers.length} Buyers (${buyerUpdated} updated).`);
}

sync()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
