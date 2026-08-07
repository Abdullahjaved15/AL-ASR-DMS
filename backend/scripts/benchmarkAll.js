const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function benchmark() {
  console.log('⚡ Running Database & Query Performance Benchmarks...');

  console.time('1. Sellers List Query (500 items)');
  const sellers = await prisma.seller.findMany({
    take: 500,
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      assignedUser: { select: { id: true, name: true, email: true } },
      images: { select: { id: true, category: true, imageUrl: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  console.timeEnd('1. Sellers List Query (500 items)');

  console.time('2. Dashboard Pipeline groupBy Query');
  const pipeline = await prisma.seller.groupBy({
    by: ['leadStatus'],
    _count: { _all: true }
  });
  console.timeEnd('2. Dashboard Pipeline groupBy Query');

  console.time('3. Salesmen Reports System Batch Query');
  const [totalLeads, activeLeads] = await Promise.all([
    prisma.seller.groupBy({
      by: ['assignedTo'],
      _count: { _all: true }
    }),
    prisma.seller.groupBy({
      by: ['assignedTo'],
      where: { leadStatus: { in: ['New Lead', 'Contacted', 'Follow Up', 'Interested', 'Negotiation'] } },
      _count: { _all: true }
    })
  ]);
  console.timeEnd('3. Salesmen Reports System Batch Query');

  console.log(`✅ All benchmarks complete! Sellers: ${sellers.length}, Pipeline statuses: ${pipeline.length}`);
}

benchmark().finally(() => prisma.$disconnect());
