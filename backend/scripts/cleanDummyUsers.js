const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'SALESMAN' }
  });

  console.log('Checking salesmen lead counts...');
  for (const u of users) {
    const sellerCount = await prisma.seller.count({
      where: {
        OR: [{ assignedTo: u.id }, { createdBy: u.id }]
      }
    });
    const buyerCount = await prisma.buyer.count({
      where: {
        OR: [{ assignedTo: u.id }, { createdBy: u.id }]
      }
    });
    const dealCount = await prisma.deal.count({
      where: { salesmanId: u.id }
    });

    console.log(`Salesman: ${u.name} (${u.email}) -> Sellers: ${sellerCount}, Buyers: ${buyerCount}, Deals: ${dealCount}`);

    if (sellerCount === 0 && buyerCount === 0 && dealCount === 0) {
      console.log(`❌ Removing dummy user with 0 activity: ${u.name} (${u.email})`);
      await prisma.activityLog.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
    }
  }
}

main().finally(() => prisma.$disconnect());
