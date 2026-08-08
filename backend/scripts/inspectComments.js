const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- CHECKING SELLER COMMENTS & REFERENCES FOR NAMES ---');
  const sellers = await prisma.seller.findMany({
    take: 20,
    select: { id: true, vehicle: true, model: true, sellerName: true, comments: true, leadReference: true, leadSource: true, assignedTo: true, assignedUser: { select: { name: true } } }
  });
  console.log('Sample sellers:', sellers);

  console.log('\n--- CHECKING BUYER COMMENTS & REFERENCES FOR NAMES ---');
  const buyers = await prisma.buyer.findMany({
    take: 20,
    select: { id: true, vehicle: true, model: true, buyerName: true, comments: true, leadReference: true, leadSource: true, assignedTo: true, assignedUser: { select: { name: true } } }
  });
  console.log('Sample buyers:', buyers);
}

main().finally(() => prisma.$disconnect());
