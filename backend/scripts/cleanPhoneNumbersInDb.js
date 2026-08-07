const { PrismaClient } = require('@prisma/client');
const { formatPakistaniPhone } = require('../src/utils/phoneFormatter');

const prisma = new PrismaClient();

async function cleanAllPhonesInDb() {
  console.log('🧹 STANDARDIZING ALL PHONE NUMBERS IN DATABASE (Format: 03000000000)...');

  // 1. Clean Users
  const users = await prisma.user.findMany();
  let updatedUsers = 0;
  for (const u of users) {
    if (u.phone) {
      const formatted = formatPakistaniPhone(u.phone);
      if (formatted !== u.phone) {
        await prisma.user.update({
          where: { id: u.id },
          data: { phone: formatted }
        });
        updatedUsers++;
      }
    }
  }
  console.log(`✅ Standardized ${updatedUsers} User phone numbers.`);

  // 2. Clean Buyers
  const buyers = await prisma.buyer.findMany();
  let updatedBuyers = 0;
  for (const b of buyers) {
    if (b.buyerPhone) {
      const formatted = formatPakistaniPhone(b.buyerPhone);
      if (formatted !== b.buyerPhone) {
        await prisma.buyer.update({
          where: { id: b.id },
          data: { buyerPhone: formatted }
        });
        updatedBuyers++;
      }
    }
  }
  console.log(`✅ Standardized ${updatedBuyers} Buyer phone numbers.`);

  // 3. Clean Sellers
  const sellers = await prisma.seller.findMany();
  let updatedSellers = 0;
  for (const s of sellers) {
    if (s.sellerPhone) {
      const formatted = formatPakistaniPhone(s.sellerPhone);
      if (formatted !== s.sellerPhone) {
        await prisma.seller.update({
          where: { id: s.id },
          data: { sellerPhone: formatted }
        });
        updatedSellers++;
      }
    }
  }
  console.log(`✅ Standardized ${updatedSellers} Seller phone numbers.`);

  console.log('🎉 ALL PHONE NUMBERS SUCCESSFULLY STANDARDIZED TO 03000000000 FORMAT!');
}

cleanAllPhonesInDb()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
