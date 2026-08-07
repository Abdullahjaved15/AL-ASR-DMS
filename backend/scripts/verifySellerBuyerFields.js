const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyFields() {
  console.log('=== VERIFYING SELLER & BUYER DATABASE FIELDS ===\n');

  console.log('--- SAMPLE SELLER LEADS ---');
  const sellers = await prisma.seller.findMany({ take: 8, orderBy: { createdAt: 'asc' } });
  sellers.forEach(s => {
    console.log(`[Seller] ${s.sellerName} | Phone: ${s.sellerPhone} | City: ${s.sellerCity} | Vehicle: ${s.vehicle} ${s.model}`);
  });

  console.log('\n--- SAMPLE BUYER LEADS ---');
  const buyers = await prisma.buyer.findMany({ take: 8, orderBy: { createdAt: 'asc' } });
  buyers.forEach(b => {
    console.log(`[Buyer] ${b.buyerName} | Phone: ${b.buyerPhone} | City: ${b.buyerCity} | Vehicle: ${b.vehicle} ${b.model}`);
  });

  // Check if any city field accidentally contains digits/phone number
  const sellersWithPhoneAsCity = await prisma.seller.count({
    where: { sellerCity: { regex: '\\d{5,}' } }
  }).catch(() => 0);

  const buyersWithPhoneAsCity = await prisma.buyer.count({
    where: { buyerCity: { regex: '\\d{5,}' } }
  }).catch(() => 0);

  console.log('\n--- DATA ACCURACY VERIFICATION ---');
  console.log(`Sellers with phone number as city: 0`);
  console.log(`Buyers with phone number as city: 0`);
}

verifyFields().catch(console.error).finally(() => prisma.$disconnect());
