const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- SELLER LEAD REFERENCES & SOURCES ---');
  const sellerRefs = await prisma.seller.groupBy({
    by: ['leadReference'],
    _count: { id: true }
  });
  console.log('Seller leadReference counts:', sellerRefs);

  const sellerSources = await prisma.seller.groupBy({
    by: ['leadSource'],
    _count: { id: true }
  });
  console.log('Seller leadSource counts:', sellerSources);

  console.log('\n--- BUYER LEAD REFERENCES & SOURCES ---');
  const buyerRefs = await prisma.buyer.groupBy({
    by: ['leadReference'],
    _count: { id: true }
  });
  console.log('Buyer leadReference counts:', buyerRefs);

  const buyerSources = await prisma.buyer.groupBy({
    by: ['leadSource'],
    _count: { id: true }
  });
  console.log('Buyer leadSource counts:', buyerSources);

  // Check unique values in leadReference
  const uniqueSellerRefs = await prisma.seller.findMany({
    where: { leadReference: { not: null } },
    select: { leadReference: true },
    distinct: ['leadReference']
  });
  console.log('\nUnique Seller leadReference values:', uniqueSellerRefs.map(r => r.leadReference));

  const uniqueBuyerRefs = await prisma.buyer.findMany({
    where: { leadReference: { not: null } },
    select: { leadReference: true },
    distinct: ['leadReference']
  });
  console.log('\nUnique Buyer leadReference values:', uniqueBuyerRefs.map(r => r.leadReference));
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
