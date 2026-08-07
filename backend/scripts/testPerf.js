const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuerySpeed() {
  console.time('Fetch 50 Sellers Query Time');
  const sellers = await prisma.seller.findMany({
    take: 50,
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      assignedUser: { select: { id: true, name: true, email: true } },
      images: { select: { id: true, category: true, imageUrl: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  console.timeEnd('Fetch 50 Sellers Query Time');
  console.log(`Fetched ${sellers.length} sellers!`);
}

testQuerySpeed().finally(() => prisma.$disconnect());
