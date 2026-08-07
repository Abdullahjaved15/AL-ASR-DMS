const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const salesmen = await prisma.user.findMany({
    where: { role: 'SALESMAN', status: 'ACTIVE' },
    select: { id: true, name: true, email: true }
  });

  if (salesmen.length === 0) {
    console.log('No active salesmen found!');
    return;
  }

  // Get all sellers assigned to ADMIN/SUPER_ADMIN or null
  const adminUsers = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, select: { id: true } });
  const adminIds = adminUsers.map(u => u.id);

  const adminSellers = await prisma.seller.findMany({
    where: { OR: [{ assignedTo: { in: adminIds } }, { assignedTo: null }] },
    select: { id: true }
  });

  console.log(`Found ${adminSellers.length} admin/unassigned sellers. Distributing...`);
  for (let i = 0; i < adminSellers.length; i++) {
    const sm = salesmen[i % salesmen.length];
    await prisma.seller.update({
      where: { id: adminSellers[i].id },
      data: { assignedTo: sm.id, createdBy: sm.id }
    });
  }

  const adminBuyers = await prisma.buyer.findMany({
    where: { OR: [{ assignedTo: { in: adminIds } }, { assignedTo: null }] },
    select: { id: true }
  });

  console.log(`Found ${adminBuyers.length} admin/unassigned buyers. Distributing...`);
  for (let i = 0; i < adminBuyers.length; i++) {
    const sm = salesmen[i % salesmen.length];
    await prisma.buyer.update({
      where: { id: adminBuyers[i].id },
      data: { assignedTo: sm.id, createdBy: sm.id }
    });
  }

  console.log('🎉 Fast distribution complete! All sellers and buyers belong to dedicated Salesmen!');
}

main().finally(() => prisma.$disconnect());
