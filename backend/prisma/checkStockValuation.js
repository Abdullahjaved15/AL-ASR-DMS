const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const activeSellers = await prisma.seller.findMany({
    where: { leadStatus: { not: 'Deal Closed' } },
    select: { id: true, sellerName: true, vehicle: true, model: true, demandPrice: true, leadStatus: true }
  });

  console.log('--- ACTIVE SHOWROOM STOCK (NOT DEAL CLOSED) ---');
  let total = 0;
  activeSellers.forEach((s, idx) => {
    const price = s.demandPrice || 0;
    total += price;
    console.log(`${idx + 1}. [${s.vehicle} ${s.model || ''}] Seller: ${s.sellerName} | Demand Price: Rs. ${price.toLocaleString()} | Status: ${s.leadStatus}`);
  });

  console.log(`\nTOTAL ACTIVE STOCK VALUATION: Rs. ${total.toLocaleString()}`);
}

main().finally(() => prisma.$disconnect());
