const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('=== VERIFYING USERS & LEAD ASSIGNMENTS IN DATABASE ===\n');

  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } });
  console.log(`Total Users in System: ${users.length}`);

  const userMap = {};
  users.forEach(u => userMap[u.id] = u.name);

  // Buyers breakdown
  const buyerGroups = await prisma.buyer.groupBy({
    by: ['assignedTo'],
    _count: { id: true }
  });

  console.log('\n--- BUYER LEADS BREAKDOWN BY SALESPERSON ---');
  const buyerBreakdown = buyerGroups.map(bg => ({
    Salesperson: userMap[bg.assignedTo] || 'Unassigned / Unknown',
    BuyerLeadsCount: bg._count.id
  }));
  console.table(buyerBreakdown);

  // Sellers breakdown
  const sellerGroups = await prisma.seller.groupBy({
    by: ['assignedTo'],
    _count: { id: true }
  });

  console.log('\n--- SELLER LEADS BREAKDOWN BY SALESPERSON ---');
  const sellerBreakdown = sellerGroups.map(sg => ({
    Salesperson: userMap[sg.assignedTo] || 'Unassigned / Unknown',
    SellerLeadsCount: sg._count.id
  }));
  console.table(sellerBreakdown);
}

verify().catch(console.error).finally(() => prisma.$disconnect());
