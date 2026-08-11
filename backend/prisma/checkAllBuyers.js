const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const allBuyers = await prisma.buyer.findMany({
    orderBy: [
      { registrationDate: 'desc' },
      { createdAt: 'desc' }
    ],
    select: {
      id: true,
      buyerName: true,
      vehicle: true,
      model: true,
      leadSource: true,
      registrationDate: true,
      createdAt: true
    }
  });

  console.log(`Total buyers in database: ${allBuyers.length}`);
  console.log('Top 15 Buyers ordered by registrationDate desc:');
  allBuyers.slice(0, 15).forEach((b, i) => {
    console.log(`#${i+1} | Name: ${b.buyerName} | Car: ${b.vehicle} ${b.model} | Source: ${b.leadSource} | regDate: ${b.registrationDate?.toISOString()} | createdAt: ${b.createdAt?.toISOString()}`);
  });
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
