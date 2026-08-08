const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- SELLER ASSIGNED BREAKDOWN ---');
  const sellerAssigned = await prisma.seller.groupBy({
    by: ['assignedTo'],
    _count: { id: true }
  });
  
  for (const s of sellerAssigned) {
    if (s.assignedTo) {
      const u = await prisma.user.findUnique({ where: { id: s.assignedTo }, select: { name: true, email: true, role: true } });
      console.log(`Assigned User: ${u?.name} (${u?.email}) [Role: ${u?.role}] -> ${s._count.id} sellers`);
    } else {
      console.log(`Unassigned -> ${s._count.id} sellers`);
    }
  }

  console.log('\n--- BUYER ASSIGNED BREAKDOWN ---');
  const buyerAssigned = await prisma.buyer.groupBy({
    by: ['assignedTo'],
    _count: { id: true }
  });
  
  for (const b of buyerAssigned) {
    if (b.assignedTo) {
      const u = await prisma.user.findUnique({ where: { id: b.assignedTo }, select: { name: true, email: true, role: true } });
      console.log(`Assigned User: ${u?.name} (${u?.email}) [Role: ${u?.role}] -> ${b._count.id} buyers`);
    } else {
      console.log(`Unassigned -> ${b._count.id} buyers`);
    }
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
