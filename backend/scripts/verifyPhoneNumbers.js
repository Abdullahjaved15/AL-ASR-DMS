const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyPhoneCompliance() {
  console.log('=== VERIFYING PHONE NUMBER COMPLIANCE IN DATABASE (Format: 03000000000) ===\n');

  const users = await prisma.user.findMany({ select: { id: true, name: true, phone: true } });
  let nonCompliantUsers = 0;
  users.forEach(u => {
    if (u.phone && !/^03\d{9}$/.test(u.phone)) {
      console.log(`Non-compliant user: ${u.name} -> "${u.phone}"`);
      nonCompliantUsers++;
    }
  });

  const buyers = await prisma.buyer.findMany({ select: { id: true, buyerName: true, buyerPhone: true } });
  let nonCompliantBuyers = 0;
  buyers.forEach(b => {
    if (b.buyerPhone && !/^03\d{9}$/.test(b.buyerPhone)) {
      console.log(`Non-compliant buyer: ${b.buyerName} -> "${b.buyerPhone}"`);
      nonCompliantBuyers++;
    }
  });

  const sellers = await prisma.seller.findMany({ select: { id: true, sellerName: true, sellerPhone: true } });
  let nonCompliantSellers = 0;
  sellers.forEach(s => {
    if (s.sellerPhone && !/^03\d{9}$/.test(s.sellerPhone)) {
      console.log(`Non-compliant seller: ${s.sellerName} -> "${s.sellerPhone}"`);
      nonCompliantSellers++;
    }
  });

  console.log(`Total Users Checked: ${users.length} | Non-compliant: ${nonCompliantUsers}`);
  console.log(`Total Buyers Checked: ${buyers.length} | Non-compliant: ${nonCompliantBuyers}`);
  console.log(`Total Sellers Checked: ${sellers.length} | Non-compliant: ${nonCompliantSellers}`);

  if (nonCompliantUsers === 0 && nonCompliantBuyers === 0 && nonCompliantSellers === 0) {
    console.log('\n🎉 100% COMPLIANCE: ALL PHONE NUMBERS IN DB MATCH THE 03000000000 FORMAT PERFECTLY!');
  }
}

verifyPhoneCompliance().catch(console.error).finally(() => prisma.$disconnect());
