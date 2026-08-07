const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const salesmen = await prisma.user.findMany({
    where: { role: 'SALESMAN', status: 'ACTIVE' },
    select: { id: true }
  });

  const adminUsers = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { id: true }
  });
  const adminIds = adminUsers.map(u => u.id);

  console.log(`Distributing remaining admin leads across ${salesmen.length} salesmen...`);

  // Bulk update seller records assigned to Admin in round-robin batches
  for (let i = 0; i < salesmen.length; i++) {
    const smId = salesmen[i].id;
    // Get sellers assigned to admin
    const sellersToUpdate = await prisma.seller.findMany({
      where: { OR: [{ assignedTo: { in: adminIds } }, { assignedTo: null }] },
      select: { id: true },
      take: 15
    });

    if (sellersToUpdate.length === 0) break;

    const ids = sellersToUpdate.map(s => s.id);
    await prisma.seller.updateMany({
      where: { id: { in: ids } },
      data: { assignedTo: smId, createdBy: smId }
    });
  }

  // Bulk update buyer records assigned to Admin in round-robin batches
  for (let i = 0; i < salesmen.length; i++) {
    const smId = salesmen[i].id;
    const buyersToUpdate = await prisma.buyer.findMany({
      where: { OR: [{ assignedTo: { in: adminIds } }, { assignedTo: null }] },
      select: { id: true },
      take: 15
    });

    if (buyersToUpdate.length === 0) break;

    const ids = buyersToUpdate.map(b => b.id);
    await prisma.buyer.updateMany({
      where: { id: { in: ids } },
      data: { assignedTo: smId, createdBy: smId }
    });
  }

  console.log('✅ Instant distribution finished successfully!');
}

main().finally(() => prisma.$disconnect());
