const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const sellerSources = await prisma.seller.groupBy({
    by: ['leadSource'],
    _count: { id: true }
  });

  const buyerSources = await prisma.buyer.groupBy({
    by: ['leadSource'],
    _count: { id: true }
  });

  const totalSellers = await prisma.seller.count();
  const totalBuyers = await prisma.buyer.count();

  console.log(`TOTAL SELLERS IN DB: ${totalSellers}`);
  console.log('Seller lead sources:', sellerSources);

  console.log(`\nTOTAL BUYERS IN DB: ${totalBuyers}`);
  console.log('Buyer lead sources:', buyerSources);
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
