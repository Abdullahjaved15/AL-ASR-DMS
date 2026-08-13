const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const closedSellers = await prisma.seller.findMany({
    where: { leadStatus: 'Deal Closed' }
  });

  const deals = await prisma.deal.findMany({
    include: { seller: true, buyer: true, salesman: true }
  });

  console.log(`Total 'Deal Closed' Sellers: ${closedSellers.length}`);
  console.log(`Total 'Deal' records in database: ${deals.length}`);

  if (closedSellers.length > 0 && deals.length === 0) {
    console.log('Syncing closed sellers to Deal table...');
    for (const seller of closedSellers) {
      await prisma.deal.create({
        data: {
          sellerId: seller.id,
          salesmanId: seller.assignedTo || seller.createdBy,
          dealPrice: seller.demandPrice || 0,
          profit: 0,
          closingDate: seller.updatedAt || new Date(),
          remarks: 'Deal closed from seller lead status update'
        }
      });
    }
    const newDeals = await prisma.deal.findMany();
    console.log(`✅ Successfully synced! Created ${newDeals.length} Deal records.`);
  } else {
    deals.forEach((d, idx) => {
      console.log(`${idx + 1}. Vehicle: ${d.seller?.vehicle || 'N/A'} ${d.seller?.model || ''} | Price: Rs. ${d.dealPrice?.toLocaleString()} | Date: ${new Date(d.closingDate).toLocaleDateString()}`);
    });
  }
}

main().finally(() => prisma.$disconnect());
