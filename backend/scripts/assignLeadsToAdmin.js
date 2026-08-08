const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stdAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!stdAdmin) {
    console.log('No Standard Admin found!');
    return;
  }

  // 1. Assign 100 sellers to Standard Admin
  const unassignedSellers = await prisma.seller.findMany({ take: 100 });
  for (const s of unassignedSellers) {
    await prisma.seller.update({
      where: { id: s.id },
      data: { createdBy: stdAdmin.id }
    });
  }
  console.log(`✅ Updated ${unassignedSellers.length} sellers createdBy to Standard Admin (${stdAdmin.email})`);

  // 2. Assign 200 buyers to Standard Admin
  const unassignedBuyers = await prisma.buyer.findMany({ take: 200 });
  for (const b of unassignedBuyers) {
    await prisma.buyer.update({
      where: { id: b.id },
      data: { createdBy: stdAdmin.id }
    });
  }
  console.log(`✅ Updated ${unassignedBuyers.length} buyers createdBy to Standard Admin (${stdAdmin.email})`);
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
