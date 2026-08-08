const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  const stdAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  console.log('--- SUPER ADMIN LEADS ---');
  const saSellers = await prisma.seller.findMany({
    where: {
      OR: [
        { assignedTo: superAdmin.id },
        { createdBy: superAdmin.id }
      ]
    }
  });
  console.log(`Super Admin Sellers found: ${saSellers.length}`);

  const saBuyers = await prisma.buyer.findMany({
    where: {
      OR: [
        { assignedTo: superAdmin.id },
        { createdBy: superAdmin.id }
      ]
    }
  });
  console.log(`Super Admin Buyers found: ${saBuyers.length}`);

  console.log('--- STANDARD ADMIN LEADS ---');
  const stdSellers = await prisma.seller.findMany({
    where: {
      OR: [
        { assignedTo: stdAdmin.id },
        { createdBy: stdAdmin.id }
      ]
    }
  });
  console.log(`Standard Admin Sellers found: ${stdSellers.length}`);
}

main().finally(() => prisma.$disconnect());
