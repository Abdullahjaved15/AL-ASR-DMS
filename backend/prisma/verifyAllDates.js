const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const excelSellers = await prisma.seller.findMany({
    where: { leadSource: 'Excel Import' },
    take: 10,
    select: { vehicle: true, model: true, year: true, sellerName: true, registrationDate: true }
  });

  const excelBuyers = await prisma.buyer.findMany({
    where: { leadSource: 'Excel Import' },
    take: 10,
    select: { vehicle: true, model: true, year: true, buyerName: true, registrationDate: true }
  });

  console.log('=== EXCEL IMPORT SELLERS (10 Samples) ===');
  excelSellers.forEach((s, idx) => {
    console.log(`#${idx+1} | ${s.vehicle} ${s.model} | Seller: ${s.sellerName} | regDate: ${s.registrationDate?.toISOString()}`);
  });

  console.log('\n=== EXCEL IMPORT BUYERS (10 Samples) ===');
  excelBuyers.forEach((b, idx) => {
    console.log(`#${idx+1} | ${b.vehicle} ${b.model} | Buyer: ${b.buyerName} | regDate: ${b.registrationDate?.toISOString()}`);
  });
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
