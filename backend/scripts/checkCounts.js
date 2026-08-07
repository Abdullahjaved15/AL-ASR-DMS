const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('Deals:', await prisma.deal.count());
  console.log('SellerImages:', await prisma.sellerImage.count());
  console.log('Collaborations:', await prisma.collaboration.count());
  console.log('Buyers:', await prisma.buyer.count());
  console.log('Sellers:', await prisma.seller.count());
  console.log('Users:', await prisma.user.count());
}

check().finally(() => prisma.$disconnect());
