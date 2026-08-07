const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('====================================================');
  console.log('WIPING ALL DATA FROM DATABASE (RESET TO CLEAN SLATE)');
  console.log('====================================================');

  console.log('1. Deleting all Sellers...');
  const deletedSellers = await prisma.seller.deleteMany({});
  console.log(`   -> Deleted ${deletedSellers.count} sellers.`);

  console.log('2. Deleting all Buyers...');
  const deletedBuyers = await prisma.buyer.deleteMany({});
  console.log(`   -> Deleted ${deletedBuyers.count} buyers.`);

  console.log('3. Deleting all Deals...');
  const deletedDeals = await prisma.deal.deleteMany({});
  console.log(`   -> Deleted ${deletedDeals.count} deals.`);

  console.log('4. Deleting all Current Stock items...');
  const deletedStock = await prisma.currentStock.deleteMany({});
  console.log(`   -> Deleted ${deletedStock.count} stock items.`);

  console.log('5. Deleting all Receiving Letters...');
  const deletedReceivingLetters = await prisma.receivingLetter.deleteMany({});
  console.log(`   -> Deleted ${deletedReceivingLetters.count} receiving letters.`);

  console.log('6. Deleting all Invoices & Vouchers...');
  const deletedInvoices = await prisma.invoice.deleteMany({});
  console.log(`   -> Deleted ${deletedInvoices.count} invoices.`);

  console.log('7. Deleting Activity Logs...');
  const deletedLogs = await prisma.activityLog.deleteMany({});
  console.log(`   -> Deleted ${deletedLogs.count} activity log entries.`);

  console.log('8. Deleting non-admin Salesman user accounts...');
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      role: 'SALESMAN'
    }
  });
  console.log(`   -> Deleted ${deletedUsers.count} salesman accounts.`);

  const remainingAdmins = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true }
  });
  console.log('\n🎉 DATABASE RESET COMPLETE! CLEAN SLATE CONFIRMED.');
  console.log('Preserved Admin Accounts:');
  for (const admin of remainingAdmins) {
    console.log(`   - ${admin.name} (${admin.email}) [Role: ${admin.role}]`);
  }
}

resetDatabase().finally(() => prisma.$disconnect());
