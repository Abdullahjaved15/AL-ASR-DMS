const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } });
  console.log('USERS IN DB:');
  console.table(users);

  for (const u of users) {
    const sellersAssigned = await prisma.seller.count({ where: { assignedTo: u.id } });
    const sellersCreated = await prisma.seller.count({ where: { createdBy: u.id } });
    const buyersAssigned = await prisma.buyer.count({ where: { assignedTo: u.id } });
    const buyersCreated = await prisma.buyer.count({ where: { createdBy: u.id } });
    console.log(`User: ${u.name} (${u.email}) [Role: ${u.role}]`);
    console.log(`  Sellers -> Assigned: ${sellersAssigned}, Created: ${sellersCreated}`);
    console.log(`  Buyers  -> Assigned: ${buyersAssigned}, Created: ${buyersCreated}`);
  }
}

main().finally(() => prisma.$disconnect());
