const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- SAMPLE SELLER COMMENTS ---');
  const sellers = await prisma.seller.findMany({ take: 10, select: { id: true, comments: true } });
  for (const s of sellers) {
    console.log(JSON.stringify(s.comments));
  }

  console.log('\n--- SAMPLE BUYER COMMENTS ---');
  const buyers = await prisma.buyer.findMany({ take: 10, select: { id: true, comments: true } });
  for (const b of buyers) {
    console.log(JSON.stringify(b.comments));
  }
}

main().finally(() => prisma.$disconnect());
