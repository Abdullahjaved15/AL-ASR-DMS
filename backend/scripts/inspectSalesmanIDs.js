const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- ALL USERS IN DATABASE ---');
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true }
  });
  console.log('Users count:', users.length);
  for (const u of users) {
    const sellerCount = await prisma.seller.count({
      where: { OR: [{ assignedTo: u.id }, { createdBy: u.id }] }
    });
    const buyerCount = await prisma.buyer.count({
      where: { OR: [{ assignedTo: u.id }, { createdBy: u.id }] }
    });
    console.log(`User: ${u.name} (${u.email}) [ID: ${u.id}] -> ${sellerCount} sellers, ${buyerCount} buyers`);
  }
}

main().finally(() => prisma.$disconnect());
