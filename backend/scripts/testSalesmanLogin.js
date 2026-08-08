const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'alasr_dms_jwt_secret_key_2026';

async function main() {
  const salesman = await prisma.user.findFirst({
    where: { role: 'SALESMAN', email: 'humam@dealership.com' }
  });

  if (!salesman) {
    console.log('Salesman humam@dealership.com not found');
    return;
  }

  console.log('Testing Salesman User:', salesman.name, salesman.email, salesman.id);

  // Check sellers in DB for this user
  const mySellers = await prisma.seller.findMany({
    where: {
      OR: [
        { assignedTo: salesman.id },
        { createdBy: salesman.id }
      ]
    }
  });
  console.log(`DB Sellers for ${salesman.name}:`, mySellers.length);

  // Check buyers in DB for this user
  const myBuyers = await prisma.buyer.findMany({
    where: {
      OR: [
        { assignedTo: salesman.id },
        { createdBy: salesman.id }
      ]
    }
  });
  console.log(`DB Buyers for ${salesman.name}:`, myBuyers.length);

  // Check all sellers in DB
  const allSellers = await prisma.seller.findMany();
  console.log('DB Total All Sellers:', allSellers.length);

  // Check all buyers in DB
  const allBuyers = await prisma.buyer.findMany();
  console.log('DB Total All Buyers:', allBuyers.length);
}

main().finally(() => prisma.$disconnect());
