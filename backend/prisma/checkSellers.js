const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.seller.count();
  const sample = await prisma.seller.findMany({
    take: 5,
    select: {
      vehicle: true,
      sellerName: true,
      registrationDate: true,
      createdAt: true
    }
  });
  console.log(`Total Sellers: ${count}`);
  console.log('Sample Sellers Registration Dates:', JSON.stringify(sample, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
