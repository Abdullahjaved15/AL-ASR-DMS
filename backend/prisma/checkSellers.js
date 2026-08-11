const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sellerCount = await prisma.seller.count();
  const buyerCount = await prisma.buyer.count();
  const sampleBuyers = await prisma.buyer.findMany({
    take: 4,
    select: {
      vehicle: true,
      model: true,
      year: true,
      buyerName: true,
      buyerCity: true,
      registrationDate: true
    }
  });

  console.log(`TOTAL SELLERS IN DB: ${sellerCount}`);
  console.log(`TOTAL BUYERS IN DB: ${buyerCount}`);
  console.log('Sample Cleaned Buyer Records:', JSON.stringify(sampleBuyers, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
