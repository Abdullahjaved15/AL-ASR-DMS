const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  const stdAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  const adminIds = [adminUser?.id, stdAdmin?.id].filter(Boolean);

  const salesmen = await prisma.user.findMany({
    where: { role: 'SALESMAN', status: 'ACTIVE' }
  });

  if (salesmen.length === 0) {
    console.log('No salesmen found!');
    return;
  }

  // 1. Reassign any sellers currently assigned to Admin to Salesmen
  const adminSellers = await prisma.seller.findMany({
    where: {
      OR: [
        { assignedTo: { in: adminIds } },
        { assignedTo: null }
      ]
    }
  });

  console.log(`Reassigning ${adminSellers.length} admin/unassigned sellers to active salesmen...`);
  for (let i = 0; i < adminSellers.length; i++) {
    const sm = salesmen[i % salesmen.length];
    await prisma.seller.update({
      where: { id: adminSellers[i].id },
      data: { assignedTo: sm.id, createdBy: sm.id }
    });
  }

  // 2. Reassign any buyers currently assigned to Admin to Salesmen
  const adminBuyers = await prisma.buyer.findMany({
    where: {
      OR: [
        { assignedTo: { in: adminIds } },
        { assignedTo: null }
      ]
    }
  });

  console.log(`Reassigning ${adminBuyers.length} admin/unassigned buyers to active salesmen...`);
  for (let i = 0; i < adminBuyers.length; i++) {
    const sm = salesmen[i % salesmen.length];
    await prisma.buyer.update({
      where: { id: adminBuyers[i].id },
      data: { assignedTo: sm.id, createdBy: sm.id }
    });
  }

  console.log('✅ All sellers and buyers are now 100% assigned to dedicated Salesman accounts!');
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
